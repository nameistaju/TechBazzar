import { useQuery } from '@tanstack/react-query';
import productsApi from '../api/productsApi';
import { categories as categoryMetaList } from '../data/categories';

const CATEGORY_META_MAP = Object.fromEntries(
  categoryMetaList.map((c) => [c.id.toLowerCase(), c])
);

export function useProducts(params = {}, options = {}) {
  return useQuery({
    queryKey: ['products', params],
    queryFn: async () => {
      const res = await productsApi.getProducts(params);
      if (res.error) throw new Error(res.error);
      return res.data;
    },
    staleTime: 60 * 1000,
    ...options
  });
}

export function useProduct(id, options = {}) {
  return useQuery({
    queryKey: ['product', id],
    queryFn: async () => {
      const res = await productsApi.getProductById(id);
      if (res.error) throw new Error(res.error);
      return res.data;
    },
    enabled: Boolean(id),
    staleTime: 60 * 1000,
    ...options
  });
}

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await productsApi.getCategories();
      if (res.error) throw new Error(res.error);
      const liveRows = res.data?.categories || [];
      const countById = Object.fromEntries(
        liveRows.map((r) => [String(r.id || '').toLowerCase(), Number(r.count || 0)])
      );
      const merged = categoryMetaList.map((meta) => ({
        ...meta,
        itemCount: countById[meta.id.toLowerCase()] ?? 0
      }));
      // Include any extra DB category not in static meta
      for (const row of liveRows) {
        const key = String(row.id || '').toLowerCase();
        if (key && !CATEGORY_META_MAP[key]) {
          merged.push({
            id: key,
            name: key.replace(/-/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase()),
            tagline: 'Catalogue',
            icon: 'Package',
            image: '/images/image-10.jpg',
            itemCount: Number(row.count || 0),
            description: ''
          });
        }
      }
      return merged;
    },
    staleTime: 5 * 60 * 1000
  });
}
