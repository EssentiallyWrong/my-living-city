import { useQuery } from "react-query"
import { IAdvertisement } from "../lib/types/data/advertisement.type"
import { IFetchError } from "../lib/types/types"
import { getAllAdvertisement, getAdvertisementByOwnerId } from "../lib/api/advertisementRoutes"

export const useAdvertisements = () => {
  return useQuery<IAdvertisement[], IFetchError>(
    'AllAdvertisement',getAllAdvertisement,
  )
}

export const useMyAdvertisment = (ownerId: any) => {
  return useQuery<IAdvertisement[], IFetchError>(
    ["MyAdvertisement", ownerId],
    () => getAdvertisementByOwnerId(ownerId),
  )
}