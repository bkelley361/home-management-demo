import * as React from 'react';
import { ActivityIndicator, Platform, Pressable, View } from 'react-native';
import {
  BugIcon,
  CircleCheckIcon,
  LightbulbIcon,
  MessageSquareIcon,
  SendIcon,
} from 'lucide-react-native';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { KeyboardAwareScrollView } from '@/components/ui/keyboard-aware-scroll-view';
import { Label } from '@/components/ui/label';
import { Text } from '@/components/ui/text';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';

type FeedbackCategory = 'bug' | 'feature' | 'general';

interface FeedbackModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FeedbackModal({ open, onOpenChange }: FeedbackModalProps) {
  const { user } = useAuth();

  const [category, setCategory] = React.useState<FeedbackCategory>('bug');
  const [message, setMessage] = React.useState('');
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isSubmitted, setIsSubmitted] = React.useState(false);
  const [errorText, setErrorText] = React.useState<string | null>(null);

  // Pre-fill user email whenever the dialog opens
  React.useEffect(() => {
    if (open) {
      if (user?.email) {
        setEmail(user.email);
      }
      setIsSubmitted(false);
      setErrorText(null);
    }
  }, [open, user?.email]);

  function handleReset() {
    setMessage('');
    setName('');
    setIsSubmitted(false);
    setErrorText(null);
  }

  function handleClose() {
    onOpenChange(false);
    setTimeout(handleReset, 300);
  }

  async function handleSubmit() {
    const trimmedMessage = message.trim();
    if (!trimmedMessage) {
      setErrorText('Please describe what happened or what you would like to share.');
      return;
    }

    setIsSubmitting(true);
    setErrorText(null);

    try {
      // Simulate submission in demo mode
      await new Promise((resolve) => setTimeout(resolve, 500));
      setIsSubmitted(true);
    } catch (err) {
      setErrorText('Could not send feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  const categoryOptions: { id: FeedbackCategory; label: string; icon: typeof BugIcon }[] = [
    { id: 'bug', label: 'Bug', icon: BugIcon },
    { id: 'feature', label: 'Idea', icon: LightbulbIcon },
    { id: 'general', label: 'Other', icon: MessageSquareIcon },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] w-[92vw] max-w-sm overflow-hidden rounded-[32px] p-0 sm:max-w-md">
        <KeyboardAwareScrollView
          className="max-h-[80vh] w-full"
          contentContainerClassName="p-6 gap-4"
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          {isSubmitted ? (
            <View className="items-center py-6 text-center">
              <View className="size-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                <Icon
                  as={CircleCheckIcon}
                  className="size-8 text-emerald-600 dark:text-emerald-400"
                />
              </View>

              <DialogTitle className="mt-4 text-center text-xl font-bold">
                Feedback Sent!
              </DialogTitle>
              <DialogDescription className="mt-2 text-center text-sm text-muted-foreground">
                Thank you for helping us improve Home Management. Your note has been delivered
                directly to our development team.
              </DialogDescription>

              <Button onPress={handleClose} className="mt-6 w-full rounded-full">
                <Text className="font-semibold text-primary-foreground">Done</Text>
              </Button>
            </View>
          ) : (
            <View className="gap-4">
              <DialogHeader className="gap-1 pr-8 text-left">
                <DialogTitle className="text-xl font-bold">Send Feedback</DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Found a bug, want to request a feature, or have a question? Let us know below.
                </DialogDescription>
              </DialogHeader>

              {/* Category Selector Pills */}
              <View className="gap-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Feedback Type
                </Label>
                <View className="flex-row gap-2">
                  {categoryOptions.map((opt) => {
                    const isSelected = category === opt.id;
                    return (
                      <Pressable
                        key={opt.id}
                        onPress={() => setCategory(opt.id)}
                        className={cn(
                          'flex-1 flex-row items-center justify-center gap-1.5 rounded-2xl border px-2 py-2.5 transition-all',
                          isSelected
                            ? 'border-primary bg-primary/10 dark:bg-primary/20'
                            : 'border-black/[0.06] bg-muted/40 dark:border-white/10 dark:bg-muted/20'
                        )}>
                        <Icon
                          as={opt.icon}
                          className={cn(
                            'size-3.5',
                            isSelected ? 'text-primary' : 'text-muted-foreground'
                          )}
                        />
                        <Text
                          className={cn(
                            'text-xs font-semibold',
                            isSelected ? 'text-primary' : 'text-muted-foreground'
                          )}>
                          {opt.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Message Input */}
              <View className="gap-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Message <Text className="text-destructive">*</Text>
                </Label>
                <Textarea
                  placeholder={
                    category === 'bug'
                      ? 'What happened, and what did you expect to happen?'
                      : category === 'feature'
                        ? 'What would make Home Management even better for you?'
                        : 'Share your thoughts, suggestions, or comments…'
                  }
                  value={message}
                  onChangeText={(text) => {
                    setMessage(text);
                    if (errorText) setErrorText(null);
                  }}
                  numberOfLines={Platform.select({ web: 3, native: 4 })}
                  className="rounded-2xl border-black/[0.06] bg-muted/30 p-3 text-sm dark:border-white/10"
                />
                {errorText ? <Text className="text-xs text-destructive">{errorText}</Text> : null}
              </View>

              {/* User Info (Email & Name) */}
              <View className="gap-3">
                <View className="gap-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Your Email
                  </Label>
                  <Input
                    value={email}
                    onChangeText={setEmail}
                    placeholder="your.email@example.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    className="rounded-2xl border-black/[0.06] bg-muted/30 px-3.5 py-2.5 text-sm dark:border-white/10"
                  />
                </View>

                <View className="gap-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Your Name <Text className="text-xs text-muted-foreground/60">(optional)</Text>
                  </Label>
                  <Input
                    value={name}
                    onChangeText={setName}
                    placeholder="First and last name"
                    className="rounded-2xl border-black/[0.06] bg-muted/30 px-3.5 py-2.5 text-sm dark:border-white/10"
                  />
                </View>
              </View>

              <DialogFooter className="mt-2 flex-row justify-end gap-2">
                <DialogClose asChild>
                  <Button variant="outline" onPress={handleClose} disabled={isSubmitting}>
                    <Text>Cancel</Text>
                  </Button>
                </DialogClose>
                <Button
                  onPress={handleSubmit}
                  disabled={isSubmitting || !message.trim()}
                  className="gap-2">
                  {isSubmitting ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Icon as={SendIcon} className="size-3.5 text-primary-foreground" />
                      <Text className="font-semibold text-primary-foreground">Submit</Text>
                    </>
                  )}
                </Button>
              </DialogFooter>
            </View>
          )}
        </KeyboardAwareScrollView>
      </DialogContent>
    </Dialog>
  );
}
