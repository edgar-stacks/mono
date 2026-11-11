import { useState } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';

import { Input } from '@leather.io/ui';
import { extractPhraseFromString } from '@leather.io/utils';

import { useFieldError, useIsFieldDirty } from '@app/common/form-utils';

import type { MnemonicFormValues } from './utils/validation';

interface MnemonicWordInputProps {
  fieldNumber: number;
  value: string;
  onUpdateWord(word: string): void;
  onPasteEntireKey(word: string): void;
}
export function MnemonicWordInput({
  fieldNumber,
  value,
  onUpdateWord,
  onPasteEntireKey,
}: MnemonicWordInputProps) {
  const name = `${fieldNumber}`;
  const { control, getValues, setValue } = useFormContext<MnemonicFormValues>();
  const fieldValue = useWatch({ control, name });
  const error = useFieldError(name);
  const [isFocused, setIsFocused] = useState(false);
  const isDirty = useIsFieldDirty(name);

  function onBlur() {
    const currentValue = getValues(name);
    if (currentValue === undefined) return;
    setValue(name, currentValue, { shouldTouch: true, shouldValidate: true });
  }

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
        onChange={e => setValue(name, e.target.value, { shouldDirty: true, shouldValidate: true })}
        onBlur={onBlur}
        value={value || fieldValue || ''}
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
