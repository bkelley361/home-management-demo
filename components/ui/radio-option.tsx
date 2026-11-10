import { Label } from '@/components/ui/label';
import { PressableScale } from '@/components/ui/pressable-scale';
import { RadioGroupItem } from '@/components/ui/radio-group';

type RadioOptionProps = {
  value: string;
  label: string;
  nativeID: string;
  onSelect: () => void;
};

export function RadioOption({ value, label, nativeID, onSelect }: RadioOptionProps) {
  return (
    <PressableScale
      activeScale={0.98}
      onPress={onSelect}
      className="flex-row items-center gap-3 rounded-2xl border border-black/[0.04] bg-muted/40 px-4 py-3.5 dark:border-white/5 dark:bg-[#1E2026]/40">
      <RadioGroupItem value={value} aria-labelledby={nativeID} />
      <Label nativeID={nativeID} onPress={onSelect} className="text-base font-medium">
        {label}
      </Label>
    </PressableScale>
  );
}
