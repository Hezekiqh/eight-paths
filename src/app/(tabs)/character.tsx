import { ClassRow } from '@/components/class-row';
import { Screen } from '@/components/screen';
import { CLASSES } from '@/game/classes';
import { DIMENSIONS } from '@/game/types';

export default function CharacterScreen() {
  return (
    <Screen title="Character">
      {DIMENSIONS.map((d) => (
        <ClassRow key={d} info={CLASSES[d]} />
      ))}
    </Screen>
  );
}
