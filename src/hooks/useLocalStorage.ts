import { useEffect, useState } from 'react'

type StorageValue<T> = T | ((prev: T) => T)

export function useLocalStorage<T>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = localStorage.getItem(key)
      return item ? JSON.parse(item) : initialValue
    } catch (error) {
      console.warn(`LocalStorage read error for key "${key}":`, error)
      return initialValue
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(storedValue))
    } catch (error) {
      console.warn(`LocalStorage write error for key "${key}":`, error)
    }
  }, [key, storedValue])

  return [storedValue, setStoredValue]
}