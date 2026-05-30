import brandsData from './brands-data.json'

export interface Brand {
  key: string
  name: string
  url: string
}

interface BrandsData {
  brands: Record<string, { name: string; url: string }>
  brandGroups: {
    noAdult: string[]
  }
}

export function getNoAdultBrands(): Brand[] {
  const data = brandsData as BrandsData

  return data.brandGroups.noAdult
    .map(key => {
      const brand = data.brands[key]
      return brand ? { key, ...brand } : null
    })
    .filter(brand => brand !== null)
    .sort((a, b) => a.name.localeCompare(b.name)) as Brand[]
}
