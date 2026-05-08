import { type ComponentProps, memo } from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  buttonTokens,
  fg,
  typeStyles,
  body,
  space,
} from '@/constants';

type IoniconsName = ComponentProps<typeof Ionicons>['name'];

export interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'destructive' | 'ghost' | 'outline';
  size?: 'md' | 'lg';
  icon?: IoniconsName;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

const variantStyles = {
  primary: {
    bg: buttonTokens.primary.background,
    text: buttonTokens.primary.text,
  },
  destructive: {
    bg: buttonTokens.destructive.background,
    text: buttonTokens.destructive.text,
  },
  ghost: {
    bg: 'transparent',
    text: fg.tertiary,
  },
  outline: {
    bg: buttonTokens.outline.background,
    text: buttonTokens.outline.text,
  },
} as const;

export const Button = memo(function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'lg',
  icon,
  loading = false,
  disabled = false,
  style,
}: ButtonProps) {
  const colors = variantStyles[variant];
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      style={[
        styles.base,
        size === 'lg' ? styles.sizeLg : styles.sizeMd,
        variant !== 'ghost' && variant !== 'outline' && { backgroundColor: colors.bg },
        variant === 'outline' && { borderWidth: buttonTokens.outline.borderWidth, borderColor: buttonTokens.outline.border },
        isDisabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color={colors.text} />
      ) : (
        <>
          {icon && (
            <Ionicons
              name={icon}
              size={24}
              color={colors.text}
            />
          )}
          <Text
            style={[
              variant === 'ghost' ? styles.ghostText : styles.text,
              { color: colors.text },
            ]}
          >
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space['8'],
    borderRadius: buttonTokens.radius,
  },
  sizeLg: {
    height: buttonTokens.primary.height,
    paddingHorizontal: buttonTokens.primary.paddingX,
  },
  sizeMd: {
    paddingVertical: space['12'],
    paddingHorizontal: space['24'],
  },
  disabled: {
    opacity: 0.6,
  },
  text: {
    ...typeStyles.buttonPrimary,
  },
  ghostText: {
    ...body.md,
    color: fg.tertiary,
  },
});
