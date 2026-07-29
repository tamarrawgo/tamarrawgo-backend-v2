import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface SavedPlace {
  id: string;
  label: string;
  icon: 'home' | 'work' | 'school' | 'place';
  address: string;
  latitude: number;
  longitude: number;
}

interface PlacesState {
  places: SavedPlace[];
  addPlace: (place: Omit<SavedPlace, 'id'>) => void;
  removePlace: (id: string) => void;
  updatePlace: (id: string, updates: Partial<Omit<SavedPlace, 'id'>>) => void;
}

export const usePlacesStore = create<PlacesState>()(
  persist(
    (set) => ({
      places: [],
      addPlace: (place) =>
        set((state) => ({
          places: [...state.places, { ...place, id: Date.now().toString() }],
        })),
      removePlace: (id) =>
        set((state) => ({
          places: state.places.filter((p) => p.id !== id),
        })),
      updatePlace: (id, updates) =>
        set((state) => ({
          places: state.places.map((p) => (p.id === id ? { ...p, ...updates } : p)),
        })),
    }),
    {
      name: 'tamarrawgo-saved-places',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
