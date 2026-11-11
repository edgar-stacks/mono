const invisibleCharacters = /[\s\p{Cc}\p{Default_Ignorable_Code_Point}⠀]/gu;

export function hasVisibleCharacter(name: string) {
  return name.replace(invisibleCharacters, '').length > 0;
}
