import { useState } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';

import { Input } from '@leather.io/ui';
import { extractPhraseFromString } from '@leather.io/utils';

import { useFieldError, useIsFieldDirty } from '@app/common/form-utils';

import type { MnemonicFormValues } from './utils/validation';

interface MnemonicWordInputProps {
  fieldNumber: number;
  value: string;
  onBlur(): void;
  onUpdateWord(word: string): void;
  onPasteEntireKey(word: string): void;
}
export function MnemonicWordInput({
  fieldNumber,
  value,
  onBlur,
  onUpdateWord,
  onPasteEntireKey,
}: MnemonicWordInputProps) {
  const name = `${fieldNumber}`;
  const { control, setValue, trigger } = useFormContext<MnemonicFormValues>();
  const fieldValue = useWatch({ control, name });
  const error = useFieldError(name);
  const [isFocused, setIsFocused] = useState(false);
  const isDirty = useIsFieldDirty(name);
  return (
    <Input.Root hasError={isDirty && !!error} shrink={!!value}>
      <Input.Field
        // Limitation of the animated label is that we cannot detect
        // programatically updated inputs. Here we add an empty place holder to
        // trigger the repositioning of the label
        autoCapitalize="off"
        autoComplete="off"
        spellCheck={false}
        data-testid={`mnemonic-input-${fieldNumber}`}
        id={name}
        type={isFocused ? 'text' : 'password'}
        onFocus={() => setIsFocused(!isFocused)}
        name={name}
        value={value || fieldValue || ''}
        onChange={e => setValue(name, e.target.value, { shouldValidate: true })}
        onBlur={() => {
          onBlur();
          void trigger(name);
        }}
        // using onChangeCapture + onBlurCapture to keep Formik validation
        onChangeCapture={(e: React.ChangeEvent<HTMLInputElement>) => {
          e.preventDefault();
          onUpdateWord(e.target.value);
        }}
        onBlurCapture={() => setIsFocused(!isFocused)}
        onPaste={e => {
          const pasteValue = extractPhraseFromString(e.clipboardData.getData('text'));
          if (pasteValue.includes(' ')) {
            e.preventDefault();
            //assume its a full key
            onPasteEntireKey(pasteValue);
          }
        }}
      />
      <Input.Label>Word {fieldNumber}</Input.Label>
    </Input.Root>
  );
}
