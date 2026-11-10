import * as React from 'react';
import {
  Dimensions,
  EmitterSubscription,
  Keyboard,
  KeyboardAvoidingView,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  ScrollView,
  type ScrollViewProps,
  type ViewStyle,
} from 'react-native';

export type KeyboardScrollContextValue = {
  scrollInputIntoView: (inputNode: any, explicitKeyboardY?: number) => void;
  registerFocusedInput: (inputNode: any) => void;
  unregisterFocusedInput: (inputNode: any) => void;
};

export const KeyboardScrollContext = React.createContext<KeyboardScrollContextValue | null>(null);

export function useKeyboardScroll() {
  return React.useContext(KeyboardScrollContext);
}

export type KeyboardAwareScrollViewProps = ScrollViewProps & {
  extraBottomOffset?: number;
  extraKeyboardMargin?: number;
  contentClassName?: string;
  enableKeyboardAvoidingView?: boolean;
};

export const KeyboardAwareScrollView = React.forwardRef<ScrollView, KeyboardAwareScrollViewProps>(
  function KeyboardAwareScrollView(
    {
      children,
      style,
      contentContainerStyle,
      extraBottomOffset = 0,
      extraKeyboardMargin = 28,
      contentClassName,
      enableKeyboardAvoidingView = false,
      onScroll,
      scrollEventThrottle = 16,
      keyboardShouldPersistTaps = 'handled',
      keyboardDismissMode = Platform.OS === 'ios' ? 'interactive' : 'on-drag',
      ...props
    },
    ref
  ) {
    const internalScrollRef = React.useRef<ScrollView | null>(null);
    const scrollYRef = React.useRef<number>(0);
    const keyboardYRef = React.useRef<number | null>(null);
    const keyboardHeightRef = React.useRef<number>(0);
    const focusedInputRef = React.useRef<any>(null);
    const [keyboardSpace, setKeyboardSpace] = React.useState<number>(0);

    const setScrollRefs = React.useCallback(
      (node: ScrollView | null) => {
        internalScrollRef.current = node;
        if (typeof ref === 'function') {
          ref(node);
        } else if (ref && typeof ref === 'object') {
          (ref as React.MutableRefObject<ScrollView | null>).current = node;
        }
      },
      [ref]
    );

    const handleScroll = React.useCallback(
      (e: NativeSyntheticEvent<NativeScrollEvent>) => {
        scrollYRef.current = e.nativeEvent.contentOffset.y;
        onScroll?.(e);
      },
      [onScroll]
    );

    const measureAndScroll = React.useCallback(
      (input: any, targetKeyboardY?: number) => {
        if (!input || !internalScrollRef.current) return;
        const ky = targetKeyboardY ?? keyboardYRef.current;
        if (!ky) return;

        if (typeof input.measureInWindow === 'function') {
          input.measureInWindow((_x: number, y: number, width: number, height: number) => {
            if (height === 0 && width === 0) return;
            const inputBottom = y + height;
            const obstacleTop = ky - extraBottomOffset;
            const targetLimit = obstacleTop - extraKeyboardMargin;

            if (inputBottom > targetLimit) {
              const overlap = inputBottom - targetLimit;
              const nextY = Math.max(0, scrollYRef.current + overlap);
              internalScrollRef.current?.scrollTo({ y: nextY, animated: true });
            }
          });
        }
      },
      [extraBottomOffset, extraKeyboardMargin]
    );

    const scrollInputIntoView = React.useCallback(
      (inputNode: any, explicitKeyboardY?: number) => {
        if (!inputNode) return;
        focusedInputRef.current = inputNode;
        requestAnimationFrame(() => {
          measureAndScroll(inputNode, explicitKeyboardY);
        });
        setTimeout(() => {
          measureAndScroll(inputNode, explicitKeyboardY);
        }, 80);
      },
      [measureAndScroll]
    );

    const registerFocusedInput = React.useCallback(
      (inputNode: any) => {
        focusedInputRef.current = inputNode;
        scrollInputIntoView(inputNode);
      },
      [scrollInputIntoView]
    );

    const unregisterFocusedInput = React.useCallback((inputNode: any) => {
      if (focusedInputRef.current === inputNode) {
        focusedInputRef.current = null;
      }
    }, []);

    React.useEffect(() => {
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
            const ky = e.endCoordinates.screenY;
            const kh = e.endCoordinates.height;
            keyboardYRef.current = ky;
            keyboardHeightRef.current = kh;
            setKeyboardSpace(kh);

            if (focusedInputRef.current) {
              scrollInputIntoView(focusedInputRef.current, ky);
            }
          })
        );
      });

      hideEvents.forEach((eventName) => {
        subscriptions.push(
          Keyboard.addListener(eventName, () => {
            keyboardYRef.current = null;
            keyboardHeightRef.current = 0;
            setKeyboardSpace(0);
          })
        );
      });

      return () => {
        subscriptions.forEach((sub) => sub.remove());
      };
    }, [scrollInputIntoView]);

    const contextValue = React.useMemo<KeyboardScrollContextValue>(
      () => ({
        scrollInputIntoView,
        registerFocusedInput,
        unregisterFocusedInput,
      }),
      [scrollInputIntoView, registerFocusedInput, unregisterFocusedInput]
    );

    const mergedContentContainerStyle = React.useMemo(() => {
      const extraPad = keyboardSpace > 0 ? keyboardSpace : 0;
      if (!extraPad) return contentContainerStyle;

      const base = (contentContainerStyle as ViewStyle) || {};
      const currentPaddingBottom = typeof base.paddingBottom === 'number' ? base.paddingBottom : 0;

      return [contentContainerStyle, { paddingBottom: currentPaddingBottom + extraPad }];
    }, [contentContainerStyle, keyboardSpace]);

    const scrollView = (
      <ScrollView
        ref={setScrollRefs}
        style={style}
        contentContainerStyle={mergedContentContainerStyle}
        contentContainerClassName={contentClassName}
        onScroll={handleScroll}
        scrollEventThrottle={scrollEventThrottle}
        keyboardShouldPersistTaps={keyboardShouldPersistTaps}
        keyboardDismissMode={keyboardDismissMode}
        {...props}>
        {children}
      </ScrollView>
    );

    return (
      <KeyboardScrollContext.Provider value={contextValue}>
        {enableKeyboardAvoidingView ? (
          <KeyboardAvoidingView
            className="flex-1"
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            {scrollView}
          </KeyboardAvoidingView>
        ) : (
          scrollView
        )}
      </KeyboardScrollContext.Provider>
    );
  }
);
