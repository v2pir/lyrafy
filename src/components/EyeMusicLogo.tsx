import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Circle, Path, Ellipse, G, Defs, RadialGradient, Stop } from 'react-native-svg';

interface EyeMusicLogoProps {
  size?: number;
  animated?: boolean;
}

const EyeMusicLogo: React.FC<EyeMusicLogoProps> = ({ size = 80, animated = false }) => {
  const centerX = size / 2;
  const centerY = size / 2;
  const eyeWidth = size * 0.6;
  const eyeHeight = size * 0.35;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Defs>
          <RadialGradient id="irisGradient" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#4ade80" stopOpacity="1" />
            <Stop offset="30%" stopColor="#22c55e" stopOpacity="1" />
            <Stop offset="60%" stopColor="#16a34a" stopOpacity="1" />
            <Stop offset="100%" stopColor="#15803d" stopOpacity="1" />
          </RadialGradient>
          <RadialGradient id="hazelGradient" cx="40%" cy="30%" r="60%">
            <Stop offset="0%" stopColor="#fbbf24" stopOpacity="0.8" />
            <Stop offset="50%" stopColor="#f59e0b" stopOpacity="0.6" />
            <Stop offset="100%" stopColor="#d97706" stopOpacity="0.4" />
          </RadialGradient>
        </Defs>
        
        {/* Eye shape */}
        <Path
          d={`M ${centerX - eyeWidth/2} ${centerY} Q ${centerX} ${centerY - eyeHeight} ${centerX + eyeWidth/2} ${centerY} Q ${centerX} ${centerY + eyeHeight} ${centerX - eyeWidth/2} ${centerY} Z`}
          fill="rgba(255, 255, 255, 0.1)"
          stroke="rgba(255, 255, 255, 0.3)"
          strokeWidth="1"
        />
        
        {/* Iris */}
        <Circle
          cx={centerX}
          cy={centerY}
          r={size * 0.15}
          fill="url(#irisGradient)"
        />
        
        {/* Hazel flecks */}
        <Circle
          cx={centerX - size * 0.05}
          cy={centerY - size * 0.03}
          r={size * 0.04}
          fill="url(#hazelGradient)"
        />
        <Circle
          cx={centerX + size * 0.04}
          cy={centerY + size * 0.02}
          r={size * 0.03}
          fill="url(#hazelGradient)"
        />
        
        {/* Pupil */}
        <Circle
          cx={centerX}
          cy={centerY}
          r={size * 0.06}
          fill="#000000"
        />
        
        {/* Musical note inside pupil */}
        <G transform={`translate(${centerX - size * 0.02}, ${centerY - size * 0.02})`}>
          {/* Note head */}
          <Ellipse
            cx={size * 0.02}
            cy={size * 0.02}
            rx={size * 0.015}
            ry={size * 0.01}
            fill="#ffffff"
          />
          {/* Note stem */}
          <Path
            d={`M ${size * 0.035} ${size * 0.01} L ${size * 0.035} ${size * 0.05}`}
            stroke="#ffffff"
            strokeWidth="1"
            fill="none"
          />
          {/* Note flag */}
          <Path
            d={`M ${size * 0.035} ${size * 0.05} Q ${size * 0.05} ${size * 0.04} ${size * 0.045} ${size * 0.06}`}
            stroke="#ffffff"
            strokeWidth="1"
            fill="none"
          />
        </G>
        
        {/* Highlight */}
        <Circle
          cx={centerX - size * 0.04}
          cy={centerY - size * 0.05}
          r={size * 0.02}
          fill="rgba(255, 255, 255, 0.8)"
        />
        
        {/* Musical staff lines around the eye */}
        <G opacity="0.3">
          {[-size * 0.2, -size * 0.1, 0, size * 0.1, size * 0.2].map((offset, index) => (
            <Path
              key={index}
              d={`M ${centerX - size * 0.4} ${centerY + offset} Q ${centerX} ${centerY + offset - size * 0.1} ${centerX + size * 0.4} ${centerY + offset}`}
              stroke="rgba(139, 92, 246, 0.6)"
              strokeWidth="1"
              fill="none"
            />
          ))}
        </G>
        
        {/* Floating musical notes */}
        <G opacity="0.4">
          {/* Note 1 */}
          <Circle cx={size * 0.2} cy={size * 0.3} r={size * 0.02} fill="#8B5CF6" />
          <Path d={`M ${size * 0.22} ${size * 0.3} L ${size * 0.22} ${size * 0.35}`} stroke="#8B5CF6" strokeWidth="1" />
          
          {/* Note 2 */}
          <Circle cx={size * 0.8} cy={size * 0.7} r={size * 0.02} fill="#EC4899" />
          <Path d={`M ${size * 0.82} ${size * 0.7} L ${size * 0.82} ${size * 0.65}`} stroke="#EC4899" strokeWidth="1" />
          
          {/* Note 3 */}
          <Circle cx={size * 0.15} cy={size * 0.8} r={size * 0.015} fill="#06B6D4" />
          <Path d={`M ${size * 0.165} ${size * 0.8} L ${size * 0.165} ${size * 0.75}`} stroke="#06B6D4" strokeWidth="1" />
        </G>
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default EyeMusicLogo;
