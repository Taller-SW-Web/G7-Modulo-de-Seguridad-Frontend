// FRONT-07: estado, rol, fragmento de correo (300 ms) y tamaño de página.
import { Group, Select, TextInput } from '@mantine/core'
import { useDebouncedCallback } from '@mantine/hooks'
import { IconSearch } from '@tabler/icons-react'
import { useEffect, useState } from 'react'
import type { FiltrosUsuarios as Filtros } from '../../shared/api'
import { ETIQUETA_ESTADO, ETIQUETA_ROL } from '../../shared/etiquetas'
import { CODIGOS_ROL, ESTADOS_CUENTA, type CodigoRol, type EstadoCuenta } from '../../shared/tipos'

const TODOS = ''

export function FiltrosUsuarios({ filtros, onCambiar }: { filtros: Filtros; onCambiar: (c: Partial<Filtros>) => void }) {
  const [correo, setCorreo] = useState(filtros.correo ?? '')
  const buscar = useDebouncedCallback((valor: string) => onCambiar({ correo: valor.trim() || undefined }), 300)

  useEffect(() => setCorreo(filtros.correo ?? ''), [filtros.correo])

  return (
    <Group align="flex-end" gap="sm" wrap="wrap">
      <TextInput
        label="Buscar por correo"
        placeholder="Parte del correo"
        leftSection={<IconSearch size={16} />}
        value={correo}
        onChange={(e) => {
          setCorreo(e.currentTarget.value)
          buscar(e.currentTarget.value)
        }}
        w={{ base: '100%', sm: 260 }}
      />
      <Select
        label="Estado"
        data={[
          { value: TODOS, label: 'Todos' },
          ...ESTADOS_CUENTA.map((e) => ({ value: e, label: ETIQUETA_ESTADO[e] })),
        ]}
        value={filtros.estado ?? TODOS}
        onChange={(v) => onCambiar({ estado: (v || undefined) as EstadoCuenta | undefined })}
        allowDeselect={false}
        w={{ base: '100%', sm: 220 }}
      />
      <Select
        label="Rol"
        data={[{ value: TODOS, label: 'Todos' }, ...CODIGOS_ROL.map((r) => ({ value: r, label: ETIQUETA_ROL[r] }))]}
        value={filtros.rol ?? TODOS}
        onChange={(v) => onCambiar({ rol: (v || undefined) as CodigoRol | undefined })}
        allowDeselect={false}
        w={{ base: '100%', sm: 240 }}
      />
      <Select
        label="Por página"
        data={['20', '50', '100']}
        value={String(filtros.tamano ?? 20)}
        onChange={(v) => onCambiar({ tamano: Number(v) })}
        allowDeselect={false}
        w={{ base: '100%', sm: 110 }}
      />
    </Group>
  )
}
