import EntityManager from '@/components/sections/entities/EntityManager'
import { ENTITY_CONFIGS } from '@/components/sections/entities/entityConfigs'

export default function EntityPage({ entity }) {
  return <EntityManager key={entity} config={ENTITY_CONFIGS[entity]} />
}
