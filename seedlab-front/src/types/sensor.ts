export type SensorType = 'temperature' | 'humidity' | 'co2' | 'light'

export type Sensor = {
  id: number
  name: string
  type: SensorType
  unit: string
  lastReading: number | null
  lastUpdate: string | null
}