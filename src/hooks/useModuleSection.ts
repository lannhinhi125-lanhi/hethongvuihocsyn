import { useApp } from '../context/AppContext';
export function useModuleSection<T extends string>(module: number, fallback: T) {
  const { moduleSections, setModuleSections } = useApp();
  const section = (moduleSections[module] || fallback) as T;
  const setSection = (value: T) => setModuleSections(previous => ({ ...previous, [module]: value }));
  return [section, setSection] as const;
}
