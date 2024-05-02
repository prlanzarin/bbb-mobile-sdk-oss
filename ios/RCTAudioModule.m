// RCTAudioModule.m
#import "RCTAudioModule.h"
#import <React/RCTLog.h>
#import <WebRTC/WebRTC.h>
#import <AVFoundation/AVFoundation.h>
#import <React/RCTEventEmitter.h>

@implementation RCTAudioModule

// To export a module named RCTAudioModule
RCT_EXPORT_MODULE();

RCT_EXPORT_METHOD(createCalendarEvent:(NSString *)name location:(NSString *)location)
{
 RCTLogInfo(@"Pretending to create an event %@ at %@", name, location);
}

@end
