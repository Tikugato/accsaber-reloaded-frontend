<script setup lang="ts">
/**
 * Schema-driven milestone querySpec builder.
 *
 * Produces a MilestoneQuerySpec:
 * {
 *   select: { function: "MAX", column: "ap" },
 *   from: "scores",
 *   filters: [
 *     { column: "col", operator: "=", value: "val" },
 *     { column: "col", operator: "IN", value: null, subquery: { ...nested } }
 *   ]
 * }
 *
 * Note: user/category/ranked-status filters are injected automatically at
 * evaluation time - do NOT add them here.
 */
import { computed, ref, watch } from 'vue'
import BaseSelect from '@/components/common/BaseSelect.vue'
import BaseInput from '@/components/common/BaseInput.vue'
import BaseButton from '@/components/common/BaseButton.vue'

export interface FilterSpec {
  column: string
  operator: string
  value: string | null
  subquery: QuerySpec | null
}

export interface QuerySpec {
  select: { function: string; column: string }
  from: string
  filters: FilterSpec[]
}

export interface SchemaTable {
  columns: Record<string, { type: string; enumValues?: string[] }>
}

export interface Schema {
  tables: Record<string, SchemaTable>
  functions?: string[]
  operators?: string[]
}

const props = defineProps<{
  schema: Schema
  modelValue: QuerySpec
  /** > 0 means this is a subquery !!*/
  depth?: number
}>()

const emit = defineEmits<{
  'update:modelValue': [QuerySpec]
}>()

const depth = computed(() => props.depth ?? 0)

const SUBQUERY_OPS = ['IN', 'NOT IN']
const ALL_FUNCTIONS = ['COUNT', 'COUNT_DISTINCT', 'MAX', 'MIN', 'SUM', 'AVG', 'PLAIN']
const ALL_OPERATORS = ['=', '!=', '>', '>=', '<', '<=', 'IN', 'NOT IN']

const local = ref<QuerySpec>(JSON.parse(JSON.stringify(props.modelValue)))
watch(() => props.modelValue, (v) => { local.value = JSON.parse(JSON.stringify(v)) }, { deep: true })
watch(local, (v) => emit('update:modelValue', JSON.parse(JSON.stringify(v))), { deep: true })

const tableOptions = computed(() =>
  Object.keys(props.schema.tables ?? {}).map((t) => ({ value: t, label: t }))
)

const columnOptions = computed(() => {
  const tbl = props.schema.tables?.[local.value.from]
  if (!tbl?.columns) return []
  return Object.keys(tbl.columns).map((c) => ({ value: c, label: c }))
})

const functionOptions = computed(() => {
  const fns = props.schema.functions ?? ALL_FUNCTIONS
  return fns
    .filter((f: string) => depth.value > 0 || f !== 'PLAIN')
    .map((f: string) => ({ value: f, label: f }))
})

const operatorOptions = computed(() =>
  (props.schema.operators ?? ALL_OPERATORS).map((o: string) => ({ value: o, label: o }))
)

const selectColumnOptions = computed(() => {
  const base = [{ value: '*', label: '* (all rows)' }, ...columnOptions.value]
  return base
})

function onFromChange(table: string) {
  local.value.from = table
  const cols = Object.keys(props.schema.tables?.[table]?.columns ?? {})
  if (cols.length && !cols.includes(local.value.select.column)) {
    local.value.select.column = cols[0]
  }
  local.value.filters.forEach((f) => {
    if (!cols.includes(f.column)) f.column = cols[0] ?? ''
  })
}

function addFilter() {
  const col = columnOptions.value[0]?.value ?? ''
  const op = (props.schema.operators ?? ALL_OPERATORS)[0]
  local.value.filters.push({ column: col, operator: op, value: '', subquery: null })
}

function removeFilter(i: number) {
  local.value.filters.splice(i, 1)
}

function onOperatorChange(i: number, op: string) {
  const f = local.value.filters[i]
  f.operator = op
  if (SUBQUERY_OPS.includes(op)) {
    f.value = null
    if (!f.subquery) {
      const firstTable = tableOptions.value[0]?.value ?? ''
      const firstCol = Object.keys(props.schema.tables?.[firstTable]?.columns ?? {})[0] ?? ''
      f.subquery = {
        select: { function: 'PLAIN', column: firstCol },
        from: firstTable,
        filters: [],
      }
    }
  } else {
    f.subquery = null
    if (f.value === null) f.value = ''
  }
}

function getEnumValues(table: string, column: string): string[] | null {
  return props.schema.tables?.[table]?.columns?.[column]?.enumValues ?? null
}

const filterColumnType = (i: number) => {
  const f = local.value.filters[i]
  return props.schema.tables?.[local.value.from]?.columns?.[f.column]?.type ?? 'STRING'
}
</script>

<template>
  <div class="qb" :class="{ 'qb--nested': depth > 0 }">
    <div v-if="depth > 0" class="qb__depth-label">Subquery</div>

    <div class="qb__clause">
      <div class="qb__field">
        <label class="qb__label">FROM</label>
        <BaseSelect
          :model-value="local.from"
          :options="tableOptions"
          @update:model-value="(v) => onFromChange(String(v))"
        />
      </div>
      <div class="qb__field">
        <label class="qb__label">SELECT function</label>
        <BaseSelect v-model="local.select.function" :options="functionOptions" />
      </div>
      <div class="qb__field">
        <label class="qb__label">Column</label>
        <BaseSelect v-model="local.select.column" :options="selectColumnOptions" />
      </div>
    </div>

    <div v-if="local.filters.length" class="qb__filters">
      <div class="qb__filters-header">
        <span class="qb__label">WHERE</span>
      </div>
      <div v-for="(filter, i) in local.filters" :key="i" class="qb__filter">
        <div class="qb__filter-row">
          <BaseSelect
            :model-value="filter.column"
            :options="columnOptions"
            style="flex: 1; min-width: 140px"
            @update:model-value="(v) => (filter.column = String(v))"
          />
          <BaseSelect
            :model-value="filter.operator"
            :options="operatorOptions"
            style="width: 110px"
            @update:model-value="(v) => onOperatorChange(i, String(v))"
          />
          <template v-if="!SUBQUERY_OPS.includes(filter.operator)">
            <BaseSelect
              v-if="getEnumValues(local.from, filter.column)"
              :model-value="filter.value ?? ''"
              :options="(getEnumValues(local.from, filter.column) ?? []).map((v) => ({ value: v, label: v }))"
              style="flex: 1"
              @update:model-value="(v) => (filter.value = String(v))"
            />
            <BaseInput
              v-else
              :model-value="filter.value ?? ''"
              placeholder="value"
              :type="filterColumnType(i).includes('INT') || filterColumnType(i).includes('DECIMAL') ? 'number' : 'text'"
              style="flex: 1"
              @update:model-value="(v) => (filter.value = String(v))"
            />
          </template>
          <span v-else class="qb__subquery-hint">↓ subquery</span>
          <button class="qb__remove-btn" aria-label="Remove filter" @click="removeFilter(i)">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div v-if="SUBQUERY_OPS.includes(filter.operator) && filter.subquery" class="qb__subquery">
          <MilestoneQueryBuilder
            :schema="schema"
            :model-value="filter.subquery"
            :depth="depth + 1"
            @update:model-value="(v) => (filter.subquery = v)"
          />
        </div>
      </div>
    </div>

    <BaseButton size="sm" @click="addFilter">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
      </svg>
      Add Filter
    </BaseButton>
  </div>
</template>

<style scoped>
.qb {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.qb--nested {
  padding: var(--space-md);
  background: var(--bg-base);
  border: 1px solid var(--bg-overlay);
  border-left: 2px solid var(--accent);
  border-radius: 0 var(--radius-card) var(--radius-card) 0;
}

.qb__depth-label {
  font-size: var(--text-caption);
  font-weight: 600;
  color: var(--accent);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: var(--space-xs);
}

.qb__clause {
  display: flex;
  gap: var(--space-sm);
  flex-wrap: wrap;
}

.qb__field {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  flex: 1;
  min-width: 140px;
}

.qb__label {
  font-size: var(--text-caption);
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.qb__filters {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.qb__filters-header {
  padding-top: var(--space-xs);
}

.qb__filter {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.qb__filter-row {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  flex-wrap: wrap;
}

.qb__subquery-hint {
  font-size: var(--text-caption);
  color: var(--text-tertiary);
  font-style: italic;
  flex: 1;
}

.qb__remove-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  flex-shrink: 0;
  background: none;
  border: 1px solid transparent;
  border-radius: var(--radius-btn);
  color: var(--text-tertiary);
  cursor: pointer;
  transition: color 100ms, border-color 100ms;
}
.qb__remove-btn:hover {
  color: var(--error);
  border-color: color-mix(in srgb, var(--error) 30%, transparent);
}

.qb__subquery {
  margin-top: var(--space-xs);
}
</style>
