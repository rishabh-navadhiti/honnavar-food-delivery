import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { mediaSrc } from '../images/loader';
import cloudKitchen from './placeholders/cloud-kitchen.svg';
import dishNonVeg from './placeholders/dish-nonveg.svg';
import dishVeg from './placeholders/dish-veg.svg';
import homeKitchen from './placeholders/home-kitchen.svg';
import restaurant from './placeholders/restaurant.svg';

export type PlaceholderKind = 'restaurant' | 'home_kitchen' | 'cloud_kitchen' | 'veg' | 'nonveg';

const placeholders = {
  restaurant,
  home_kitchen: homeKitchen,
  cloud_kitchen: cloudKitchen,
  veg: dishVeg,
  nonveg: dishNonVeg,
} as const;

type PhotoProps = {
  imageId: string | null;
  /** Alt text: the localised kitchen or dish name. */
  alt: string;
  placeholder: PlaceholderKind;
  sizes: string;
  className?: string;
  priority?: boolean;
};

/**
 * A resized, lazily loaded photo (research R7), or the matching placeholder illustration
 * when there is no photo.
 */
export function Photo({ imageId, alt, placeholder, sizes, className = '', priority = false }: PhotoProps) {
  const t = useTranslations('placeholder');
  const frame = `relative overflow-hidden bg-primary-soft ${className}`;
  if (imageId) {
    return (
      <div className={frame}>
        <Image src={mediaSrc(imageId)} alt={alt} fill sizes={sizes} priority={priority} className="object-cover" />
      </div>
    );
  }
  const isDish = placeholder === 'veg' || placeholder === 'nonveg';
  return (
    <div className={frame}>
      <Image
        src={placeholders[placeholder]}
        alt={`${alt} — ${isDish ? t('dish') : t('kitchen')}`}
        fill
        sizes={sizes}
        unoptimized
        className="object-cover"
      />
    </div>
  );
}
