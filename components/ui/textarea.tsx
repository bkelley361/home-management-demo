import { cn } from '@/lib/utils';
import * as React from 'react';
import {
  Animated,
  Dimensions,
  EmitterSubscription,
  Keyboard,
  NativeSyntheticEvent,
  Platform,
  TargetedEvent,
  TextInput,
} from 'react-native';
import { useKeyboardScroll } from '@/components/ui/keyboard-aware-scroll-view';

type TextareaProps = React.ComponentProps<typeof TextInput> &
  React.RefAttributes<TextInput> & {
    placeholderClassName?: string;
  };

function Textarea({
  className,
  multiline = true,
  numberOfLines = Platform.select({ web: 3, native: 8 }),
  placeholderClassName,
  onFocus,
  onBlur,
  ...props
}: TextareaProps) {
  const internalRef = React.useRef<TextInput | null>(null);
  const isFocusedRef = React.useRef(false);
  const translateY = React.useRef(new Animated.Value(0)).current;
  const keyboardScroll = useKeyboardScroll();

  const setRefs = React.useCallback(
    (node: TextInput | null) => {
      internalRef.current = node;
      const ref = props.ref;
      if (typeof ref === 'function') {
        ref(node);
      } else if (ref && typeof ref === 'object') {
        (ref as React.MutableRefObject<TextInput | null>).current = node;
      }
    },
    [props.ref]
  );

  const checkStandaloneSlide = React.useCallback(
    (keyboardY?: number) => {
      if (keyboardScroll || !internalRef.current) return;

      const screenH = Dimensions.get('window').height;
      const ky = keyboardY ?? screenH;

      requestAnimationFrame(() => {
        internalRef.current?.measureInWindow((_x, y, width, height) => {
          if (height === 0 && width === 0) return;
          const inputBottom = y + height;
          const targetLimit = ky - 24;
          if (inputBottom > targetLimit) {
            const overlap = inputBottom - targetLimit;
            Animated.timing(translateY, {
              toValue: -overlap,
              duration: 250,
              useNativeDriver: true,
            }).start();
          }
        });
      });
    },
    [keyboardScroll, translateY]
  );

  const handleFocus = React.useCallback(
    (e: NativeSyntheticEvent<TargetedEvent>) => {
      isFocusedRef.current = true;
      if (keyboardScroll) {
        keyboardScroll.registerFocusedInput(internalRef.current);
      } else {
        checkStandaloneSlide();
      }
      onFocus?.(e);
    },
    [keyboardScroll, checkStandaloneSlide, onFocus]
  );

  const handleBlur = React.useCallback(
    (e: NativeSyntheticEvent<TargetedEvent>) => {
      isFocusedRef.current = false;
      if (keyboardScroll) {
        keyboardScroll.unregisterFocusedInput(internalRef.current);
      } else {
        Animated.timing(translateY, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }).start();
      }
      onBlur?.(e);
    },
    [keyboardScroll, translateY, onBlur]
  );

  React.useEffect(() => {
    if (keyboardScroll) return;

    const showEvents = Platform.select({
      ios: ['keyboardWillShow', 'keyboardDidShow'],
      default: ['keyboardDidShow'],
    }) as Array<'keyboardWillShow' | 'keyboardDidShow'>;

    const hideEvents = Platform.select({
      ios: ['keyboardWillHide', 'keyboardDidHide'],
      default: ['keyboardDidHide'],
    }) as Array<'keyboardWillHide' | 'keyboardDidHide'>;

    const subscriptions: EmitterSubscription[] = [];

    showEvents.forEach((eventName) => {
      subscriptions.push(
        Keyboard.addListener(eventName, (e) => {
          if (isFocusedRef.current) {
            checkStandaloneSlide(e.endCoordinates.screenY);
          }
        })
      );
    });

    hideEvents.forEach((eventName) => {
      subscriptions.push(
        Keyboard.addListener(eventName, () => {
          Animated.timing(translateY, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }).start();
        })
      );
    });

    return () => {
      subscriptions.forEach((sub) => sub.remove());
    };
  }, [keyboardScroll, checkStandaloneSlide, translateY]);

  const textInput = (
    <TextInput
      ref={setRefs}
      className={cn(
        'flex min-h-24 w-full flex-row rounded-[24px] border border-transparent bg-muted px-5 py-4 text-base leading-relaxed text-foreground dark:border-white/10 dark:bg-[#1E2026]',
        Platform.select({
          web: 'aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive field-sizing-content resize-y outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed',
          native: 'placeholder:text-muted-foreground/60',
        }),
        props.editable === false && 'opacity-50',
        className
      )}
      multiline={multiline}
      numberOfLines={numberOfLines}
      textAlignVertical="top"
      onFocus={handleFocus}
      onBlur={handleBlur}
      {...props}
    />
  );

  if (!keyboardScroll) {
    return (
      <Animated.View style={{ transform: [{ translateY }] }} className="w-full">
        {textInput}
      </Animated.View>
    );
  }

  return textInput;
}

export { Textarea };
