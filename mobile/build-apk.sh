#!/bin/bash
set -e

# Build script for Follow Up Android APK
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

export JAVA_HOME="${JAVA_HOME:-/opt/homebrew/opt/openjdk@17}"
export ANDROID_HOME="${ANDROID_HOME:-$HOME/Library/Android/sdk}"

echo "Building Follow Up Android APK with Java: $JAVA_HOME and Android SDK: $ANDROID_HOME..."

./gradlew assembleDebug

cp app/build/outputs/apk/debug/app-debug.apk FollowUp.apk

echo "===================================================="
echo " APK successfully built!"
echo " Location: $DIR/FollowUp.apk"
echo " Size: $(du -h "$DIR/FollowUp.apk" | cut -f1)"
echo "===================================================="
