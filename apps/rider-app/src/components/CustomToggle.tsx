import React, { useEffect, useRef } from 'react';
import { TouchableOpacity, Animated, StyleSheet, Text, View } from 'react-native';

interface CustomToggleProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
}

export default function CustomToggle({ value, onValueChange, disabled }: CustomToggleProps) {
  const animValue = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(animValue, {
      toValue: value ? 1 : 0,
      useNativeDriver: false,
      friction: 6,
      tension: 80,
    }).start();
  }, [value]);

  const trackColor = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['#D0D0D0', '#1B6B2F'],
  });

  const thumbPosition = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [2, 26],
  });

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => !disabled && onValueChange(!value)}
      disabled={disabled}
      style={[styles.container, disabled && { opacity: 0.5 }]}
    >
      <Animated.View style={[styles.track, { backgroundColor: trackColor }]}>
        {/* Left icon */}
        <View style={styles.iconLeft}>
          {value && <Text style={styles.checkmark}>✓</Text>}
        </View>
        {/* Right icon */}
        <View style={styles.iconRight}>
          {!value && <Text style={styles.cross}>✕</Text>}
        </View>
        {/* Thumb */}
        <Animated.View style={[styles.thumb, { left: thumbPosition }]} />
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { justifyContent: 'center' },
  track: {
    width: 56, height: 30, borderRadius: 15,
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingHorizontal: 6,
    position: 'relative',
  },
  iconLeft: { width: 18, alignItems: 'center' },
  iconRight: { width: 18, alignItems: 'center' },
  checkmark: { fontSize: 13, color: '#fff', fontWeight: '900' },
  cross: { fontSize: 13, color: '#999', fontWeight: '900' },
  thumb: {
    position: 'absolute',
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: '#fff',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25, shadowRadius: 3, elevation: 4,
  },
});
