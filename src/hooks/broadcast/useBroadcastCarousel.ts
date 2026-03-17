import { useState } from 'react';
import { CarouselData, createEmptyCard } from '@/components/broadcast/CarouselEditor';
import type { InitialData } from './types';

export function useBroadcastCarousel(initialData?: InitialData) {
  const [carouselData, setCarouselData] = useState<CarouselData>(() => {
    if (initialData?.carouselData && initialData.carouselData.cards) {
      return {
        message: initialData.carouselData.message || '',
        cards: initialData.carouselData.cards.map((card) => ({
          id: card.id || crypto.randomUUID(),
          text: card.text || '',
          image: card.image || '',
          buttons: card.buttons?.map((btn) => ({
            id: btn.id || crypto.randomUUID(),
            type: btn.type,
            label: btn.label,
            url: btn.type === 'URL' ? (btn.value || '') : '',
            phone: btn.type === 'CALL' ? (btn.value || '') : '',
          })) || [],
        })),
      };
    }
    return { message: '', cards: [createEmptyCard(), createEmptyCard()] };
  });

  const isCarouselValid = carouselData.cards.length >= 2 &&
    carouselData.cards.every(c => (c.image || c.imageFile) && c.text.trim()) &&
    carouselData.cards.every(c => c.buttons.every(b =>
      b.label.trim() && (b.type !== 'URL' || b.url?.trim()) && (b.type !== 'CALL' || b.phone?.trim())
    ));

  const resetCarousel = () => {
    setCarouselData({ message: '', cards: [createEmptyCard(), createEmptyCard()] });
  };

  return { carouselData, setCarouselData, isCarouselValid, resetCarousel };
}
