#include <CoreFoundation/CoreFoundation.h>
#include <IOKit/hid/IOHIDManager.h>
#include <mach/mach_error.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>

enum {
    K08_VENDOR_ID = 0x30fa,
    K08_PRODUCT_ID = 0x1340,
    K08_REPORT_ID = 0x07,
    K08_REPORT_LEN = 8
};

static int cf_number_int(IOHIDDeviceRef device, CFStringRef key, int fallback) {
    CFTypeRef value = IOHIDDeviceGetProperty(device, key);
    int result = fallback;
    if (value && CFGetTypeID(value) == CFNumberGetTypeID()) {
        CFNumberGetValue((CFNumberRef)value, kCFNumberIntType, &result);
    }
    return result;
}

static void cf_string_print(IOHIDDeviceRef device, CFStringRef key, const char *fallback) {
    CFTypeRef value = IOHIDDeviceGetProperty(device, key);
    char buffer[256];
    if (value && CFGetTypeID(value) == CFStringGetTypeID() &&
        CFStringGetCString((CFStringRef)value, buffer, sizeof(buffer), kCFStringEncodingUTF8)) {
        fputs(buffer, stdout);
        return;
    }
    fputs(fallback, stdout);
}

static void print_report(const char *prefix, const uint8_t report[K08_REPORT_LEN]) {
    printf("%s", prefix);
    for (int i = 0; i < K08_REPORT_LEN; i++) {
        printf("%s%02x", i ? " " : "", report[i]);
    }
    printf("\n");
}

static CFMutableDictionaryRef make_match_dictionary(void) {
    CFMutableDictionaryRef match = CFDictionaryCreateMutable(
        kCFAllocatorDefault, 0, &kCFTypeDictionaryKeyCallBacks, &kCFTypeDictionaryValueCallBacks);
    int vendor = K08_VENDOR_ID;
    int product = K08_PRODUCT_ID;
    CFNumberRef vendor_ref = CFNumberCreate(kCFAllocatorDefault, kCFNumberIntType, &vendor);
    CFNumberRef product_ref = CFNumberCreate(kCFAllocatorDefault, kCFNumberIntType, &product);
    CFDictionarySetValue(match, CFSTR(kIOHIDVendorIDKey), vendor_ref);
    CFDictionarySetValue(match, CFSTR(kIOHIDProductIDKey), product_ref);
    CFRelease(vendor_ref);
    CFRelease(product_ref);
    return match;
}

static IOHIDDeviceRef find_k08_device(IOHIDManagerRef manager, int verbose) {
    CFSetRef devices = IOHIDManagerCopyDevices(manager);
    if (!devices) {
        return NULL;
    }

    CFIndex count = CFSetGetCount(devices);
    IOHIDDeviceRef *values = calloc((size_t)count, sizeof(IOHIDDeviceRef));
    if (!values) {
        CFRelease(devices);
        return NULL;
    }
    CFSetGetValues(devices, (const void **)values);

    IOHIDDeviceRef selected = NULL;
    for (CFIndex i = 0; i < count; i++) {
        IOHIDDeviceRef device = values[i];
        int usage_page = cf_number_int(device, CFSTR(kIOHIDPrimaryUsagePageKey), -1);
        int usage = cf_number_int(device, CFSTR(kIOHIDPrimaryUsageKey), -1);
        int feature = cf_number_int(device, CFSTR(kIOHIDMaxFeatureReportSizeKey), 0);
        int input = cf_number_int(device, CFSTR(kIOHIDMaxInputReportSizeKey), 0);
        int output = cf_number_int(device, CFSTR(kIOHIDMaxOutputReportSizeKey), 0);

        if (verbose) {
            printf("device[%ld]: ", (long)i);
            cf_string_print(device, CFSTR(kIOHIDProductKey), "(unknown product)");
            printf(" usagePage=%d usage=%d maxFeature=%d maxInput=%d maxOutput=%d\n",
                   usage_page, usage, feature, input, output);
        }

        if (!selected && usage_page == 1 && usage == 6 && feature >= K08_REPORT_LEN) {
            selected = device;
            CFRetain(selected);
        }
    }

    free(values);
    CFRelease(devices);
    return selected;
}

static int open_selected_device(IOHIDDeviceRef device) {
    IOReturn result = IOHIDDeviceOpen(device, kIOHIDOptionsTypeNone);
    if (result != kIOReturnSuccess) {
        fprintf(stderr, "IOHIDDeviceOpen failed: 0x%08x %s\n", result, mach_error_string(result));
        return 1;
    }
    return 0;
}

static int set_feature(IOHIDDeviceRef device, const uint8_t report[K08_REPORT_LEN]) {
    IOReturn result = IOHIDDeviceSetReport(
        device, kIOHIDReportTypeFeature, K08_REPORT_ID, report, K08_REPORT_LEN);
    if (result != kIOReturnSuccess) {
        fprintf(stderr, "SetFeature failed: 0x%08x %s\n", result, mach_error_string(result));
        return 1;
    }
    return 0;
}

static int get_feature(IOHIDDeviceRef device, uint8_t report[K08_REPORT_LEN], CFIndex *length) {
    *length = K08_REPORT_LEN;
    memset(report, 0, K08_REPORT_LEN);
    report[0] = K08_REPORT_ID;
    IOReturn result = IOHIDDeviceGetReport(
        device, kIOHIDReportTypeFeature, K08_REPORT_ID, report, length);
    if (result != kIOReturnSuccess) {
        fprintf(stderr, "GetFeature failed: 0x%08x %s\n", result, mach_error_string(result));
        return 1;
    }
    return 0;
}

static int read_status(IOHIDDeviceRef device) {
    uint8_t values[8] = {0};

    for (uint8_t index = 0; index < 8; index++) {
        uint8_t request[K08_REPORT_LEN] = {
            K08_REPORT_ID, 0x18, 0x05, index, 0x18, 0x00, 0x00, 0x07
        };
        uint8_t response[K08_REPORT_LEN] = {0};
        CFIndex response_len = K08_REPORT_LEN;

        print_report("set ", request);
        if (set_feature(device, request)) {
            return 1;
        }
        usleep(2000);
        if (get_feature(device, response, &response_len)) {
            return 1;
        }
        print_report("get ", response);
        printf("len %ld value[%u]=0x%02x\n", (long)response_len, index, response[1]);
        values[index] = response[1];
    }

    uint8_t reset[K08_REPORT_LEN] = {K08_REPORT_ID, 0x18, 0, 0, 0, 0, 0, 0};
    print_report("reset ", reset);
    if (set_feature(device, reset)) {
        return 1;
    }

    printf("status:");
    for (int i = 0; i < 8; i++) {
        printf(" %02x", values[i]);
    }
    printf("\n");
    return 0;
}

static int read_profile(IOHIDDeviceRef device) {
    uint8_t response[K08_REPORT_LEN] = {0};
    CFIndex response_len = K08_REPORT_LEN;

    if (get_feature(device, response, &response_len)) {
        return 1;
    }
    print_report("feature ", response);
    printf("profile=%u\n", (unsigned)((response[6] >> 2) & 0x03));
    return 0;
}

static int set_profile(IOHIDDeviceRef device, unsigned profile) {
    if (profile > 3) {
        fprintf(stderr, "profile expects 0..3\n");
        return 2;
    }

    uint8_t report[K08_REPORT_LEN] = {0};
    CFIndex report_len = K08_REPORT_LEN;
    if (get_feature(device, report, &report_len)) {
        return 1;
    }
    print_report("before ", report);
    report[6] = (uint8_t)((report[6] & ~0x0c) | ((profile & 0x03) << 2));
    print_report("set ", report);
    if (set_feature(device, report)) {
        return 1;
    }
    usleep(5000);
    if (get_feature(device, report, &report_len)) {
        return 1;
    }
    print_report("after ", report);
    printf("profile=%u\n", (unsigned)((report[6] >> 2) & 0x03));
    return 0;
}

static int send_function_code(IOHIDDeviceRef device, unsigned function_code) {
    if (function_code > 0xff) {
        fprintf(stderr, "function-code expects 0..255\n");
        return 2;
    }

    uint8_t report[K08_REPORT_LEN] = {
        K08_REPORT_ID, 0x10, 0x01, (uint8_t)function_code, 0x00, 0x00, 0x00, 0x00
    };
    print_report("select ", report);
    if (set_feature(device, report)) {
        return 1;
    }
    usleep(20000);
    return read_profile(device);
}

static int read_block(IOHIDDeviceRef device, unsigned address, unsigned count) {
    if (address > 0xffff || count == 0 || count > 32) {
        fprintf(stderr, "read expects address <= 0xffff and count 1..32\n");
        return 2;
    }

    uint8_t *values = calloc(count, 1);
    if (!values) {
        fprintf(stderr, "out of memory\n");
        return 1;
    }

    for (unsigned index = 0; index < count; index++) {
        uint8_t request[K08_REPORT_LEN] = {
            K08_REPORT_ID, 0x18, 0x05, (uint8_t)index,
            (uint8_t)(address & 0xff), (uint8_t)((address >> 8) & 0xff),
            0x00, (uint8_t)((count - 1) & 0xff)
        };
        uint8_t response[K08_REPORT_LEN] = {0};
        CFIndex response_len = K08_REPORT_LEN;

        if (set_feature(device, request)) {
            free(values);
            return 1;
        }
        usleep(2000);
        if (get_feature(device, response, &response_len)) {
            free(values);
            return 1;
        }
        values[index] = response[1];
    }

    uint8_t reset[K08_REPORT_LEN] = {K08_REPORT_ID, 0x18, 0, 0, 0, 0, 0, 0};
    int rc = set_feature(device, reset);
    if (!rc) {
        for (unsigned row = 0; row < count; row += 16) {
            printf("%04x:", address + row);
            for (unsigned col = 0; col < 16 && row + col < count; col++) {
                printf(" %02x", values[row + col]);
            }
            printf("  ");
            for (unsigned col = 0; col < 16 && row + col < count; col++) {
                uint8_t ch = values[row + col];
                putchar(ch >= 32 && ch < 127 ? ch : '.');
            }
            printf("\n");
        }
    }

    free(values);
    return rc;
}

static int read_byte(IOHIDDeviceRef device, unsigned address, uint8_t *value) {
    uint8_t request[K08_REPORT_LEN] = {
        K08_REPORT_ID, 0x18, 0x05, 0x00,
        (uint8_t)(address & 0xff), (uint8_t)((address >> 8) & 0xff),
        0x00, 0x00
    };
    uint8_t response[K08_REPORT_LEN] = {0};
    CFIndex response_len = K08_REPORT_LEN;

    if (set_feature(device, request)) {
        return 1;
    }
    usleep(2000);
    if (get_feature(device, response, &response_len)) {
        return 1;
    }
    *value = response[1];

    uint8_t reset[K08_REPORT_LEN] = {K08_REPORT_ID, 0x18, 0, 0, 0, 0, 0, 0};
    return set_feature(device, reset);
}

static int write_block(IOHIDDeviceRef device, unsigned address, const uint8_t *values, unsigned count) {
    if (address > 0xffff || count == 0 || count > 32) {
        fprintf(stderr, "write expects address <= 0xffff and count 1..32\n");
        return 2;
    }

    for (unsigned index = 0; index < count; index++) {
        uint8_t request[K08_REPORT_LEN] = {
            K08_REPORT_ID, 0x18, 0x03, (uint8_t)index,
            (uint8_t)(address & 0xff), (uint8_t)((address >> 8) & 0xff),
            values[index], (uint8_t)((count - 1) & 0xff)
        };
        print_report("set ", request);
        if (set_feature(device, request)) {
            return 1;
        }
    }

    usleep(4000);
    uint8_t finalize[K08_REPORT_LEN] = {
        K08_REPORT_ID, 0x18, 0x09, 0x00,
        (uint8_t)(address & 0xff), (uint8_t)((address >> 8) & 0xff),
        0x00, (uint8_t)((count - 1) & 0xff)
    };
    print_report("final ", finalize);
    if (set_feature(device, finalize)) {
        return 1;
    }

    usleep(2000);
    uint8_t reset[K08_REPORT_LEN] = {
        K08_REPORT_ID, 0x18, 0x00, 0x00,
        (uint8_t)(address & 0xff), (uint8_t)((address >> 8) & 0xff),
        0x00, 0x00
    };
    print_report("reset ", reset);
    return set_feature(device, reset);
}

static int poke_same(IOHIDDeviceRef device, unsigned address) {
    uint8_t value = 0;
    if (read_byte(device, address, &value)) {
        return 1;
    }
    printf("current[%04x]=%02x\n", address, value);
    int rc = write_block(device, address, &value, 1);
    if (rc) {
        return rc;
    }
    uint8_t after = 0;
    if (read_byte(device, address, &after)) {
        return 1;
    }
    printf("after[%04x]=%02x\n", address, after);
    return after == value ? 0 : 1;
}

static int send_commit_sequence(IOHIDDeviceRef device) {
    uint8_t enter[K08_REPORT_LEN] = {K08_REPORT_ID, 0x18, 0x10, 0, 0, 0, 0, 0};
    uint8_t reset[K08_REPORT_LEN] = {K08_REPORT_ID, 0x18, 0, 0, 0, 0, 0, 0};
    uint8_t commit[K08_REPORT_LEN] = {K08_REPORT_ID, 0x20, 0, 0, 0, 0, 0, 0};

    print_report("set ", enter);
    if (set_feature(device, enter)) return 1;
    usleep(5000);
    print_report("set ", reset);
    if (set_feature(device, reset)) return 1;
    print_report("set ", commit);
    if (set_feature(device, commit)) return 1;
    return 0;
}

static int hex_value(int ch) {
    if (ch >= '0' && ch <= '9') return ch - '0';
    if (ch >= 'a' && ch <= 'f') return ch - 'a' + 10;
    if (ch >= 'A' && ch <= 'F') return ch - 'A' + 10;
    return -1;
}

static int parse_hex_bytes(const char *text, uint8_t *values, unsigned *count) {
    unsigned out = 0;
    int high = -1;

    for (const char *p = text; *p; p++) {
        int value = hex_value((unsigned char)*p);
        if (value < 0) {
            if (*p == ' ' || *p == ':' || *p == ',' || *p == '-' || *p == '_') {
                continue;
            }
            fprintf(stderr, "invalid hex character: %c\n", *p);
            return 2;
        }
        if (high < 0) {
            high = value;
        } else {
            if (out >= 32) {
                fprintf(stderr, "write-hex accepts up to 32 bytes per call\n");
                return 2;
            }
            values[out++] = (uint8_t)((high << 4) | value);
            high = -1;
        }
    }

    if (high >= 0) {
        fprintf(stderr, "odd number of hex digits\n");
        return 2;
    }
    if (!out) {
        fprintf(stderr, "empty byte string\n");
        return 2;
    }
    *count = out;
    return 0;
}

static int write_hex(IOHIDDeviceRef device, unsigned address, const char *hex) {
    uint8_t values[32] = {0};
    unsigned count = 0;
    int rc = parse_hex_bytes(hex, values, &count);
    if (rc) {
        return rc;
    }
    return write_block(device, address, values, count);
}

static void usage(const char *argv0) {
    fprintf(stderr,
            "Usage: %s list|status|profile|set-profile <0..3>|function-code <0..255>|read <hex-address> <count>|write-hex <hex-address> <hex-bytes>|poke-same <hex-address>|commit\n",
            argv0);
}

int main(int argc, char **argv) {
    const char *command = argc > 1 ? argv[1] : "list";
    if (strcmp(command, "list") && strcmp(command, "status") && strcmp(command, "profile") && strcmp(command, "set-profile") && strcmp(command, "function-code") && strcmp(command, "read") &&
        strcmp(command, "write-hex") && strcmp(command, "poke-same") && strcmp(command, "commit")) {
        usage(argv[0]);
        return 2;
    }
    if (!strcmp(command, "read") && argc != 4) {
        usage(argv[0]);
        return 2;
    }
    if (!strcmp(command, "write-hex") && argc != 4) {
        usage(argv[0]);
        return 2;
    }
    if (!strcmp(command, "poke-same") && argc != 3) {
        usage(argv[0]);
        return 2;
    }
    if (!strcmp(command, "set-profile") && argc != 3) {
        usage(argv[0]);
        return 2;
    }
    if (!strcmp(command, "function-code") && argc != 3) {
        usage(argv[0]);
        return 2;
    }

    IOHIDManagerRef manager = IOHIDManagerCreate(kCFAllocatorDefault, kIOHIDOptionsTypeNone);
    if (!manager) {
        fprintf(stderr, "IOHIDManagerCreate failed\n");
        return 1;
    }

    CFMutableDictionaryRef match = make_match_dictionary();
    IOHIDManagerSetDeviceMatching(manager, match);
    CFRelease(match);

    IOReturn open_result = IOHIDManagerOpen(manager, kIOHIDOptionsTypeNone);
    if (open_result != kIOReturnSuccess) {
        fprintf(stderr, "IOHIDManagerOpen failed: 0x%08x %s\n", open_result, mach_error_string(open_result));
        CFRelease(manager);
        return 1;
    }

    IOHIDDeviceRef device = find_k08_device(manager, !strcmp(command, "list") || !strcmp(command, "status"));
    if (!device) {
        fprintf(stderr, "K08 keyboard HID interface not found\n");
        IOHIDManagerClose(manager, kIOHIDOptionsTypeNone);
        CFRelease(manager);
        return 1;
    }

    int rc = 0;
    if (!strcmp(command, "status") || !strcmp(command, "profile") || !strcmp(command, "set-profile") || !strcmp(command, "function-code") || !strcmp(command, "read") || !strcmp(command, "write-hex") ||
        !strcmp(command, "poke-same") || !strcmp(command, "commit")) {
        rc = open_selected_device(device);
        if (!rc && !strcmp(command, "status")) {
            rc = read_status(device);
        } else if (!rc && !strcmp(command, "profile")) {
            rc = read_profile(device);
        } else if (!rc && !strcmp(command, "set-profile")) {
            unsigned profile = (unsigned)strtoul(argv[2], NULL, 0);
            rc = set_profile(device, profile);
        } else if (!rc && !strcmp(command, "function-code")) {
            unsigned function_code = (unsigned)strtoul(argv[2], NULL, 0);
            rc = send_function_code(device, function_code);
        } else if (!rc && !strcmp(command, "read")) {
            unsigned address = (unsigned)strtoul(argv[2], NULL, 0);
            unsigned count = (unsigned)strtoul(argv[3], NULL, 0);
            rc = read_block(device, address, count);
        } else if (!rc && !strcmp(command, "write-hex")) {
            unsigned address = (unsigned)strtoul(argv[2], NULL, 0);
            rc = write_hex(device, address, argv[3]);
        } else if (!rc && !strcmp(command, "poke-same")) {
            unsigned address = (unsigned)strtoul(argv[2], NULL, 0);
            rc = poke_same(device, address);
        } else if (!rc && !strcmp(command, "commit")) {
            rc = send_commit_sequence(device);
        }
        IOHIDDeviceClose(device, kIOHIDOptionsTypeNone);
    }

    CFRelease(device);
    IOHIDManagerClose(manager, kIOHIDOptionsTypeNone);
    CFRelease(manager);
    return rc;
}
