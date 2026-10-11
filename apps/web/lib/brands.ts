import brandsData from './brands-data.json'

export interface Brand {
  slug: string
  name: string
  url: string
}

// brands-data.json is a snapshot of the shared `mainBrandsAll` brand set
// (serpcompany/serp workers/brands-page/data/), the list the shared brands Worker
// served on this site's /brands/ until this app took the page over (#60). It
// doesn't follow the shared data: update it by hand.
export function getBrands(): Brand[] {
  return [...brandsData.brands].sort((a, b) => a.name.localeCompare(b.name, 'en'))
}
