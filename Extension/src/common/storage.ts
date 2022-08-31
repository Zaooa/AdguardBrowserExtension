/**
 * Common storage interface
 */
export interface StorageInterface<K = string, V = unknown> {
    set(key: K, value: V): Awaited<void>

    get(key: K): Awaited<V | undefined>

    remove(key: K): Awaited<void>
}
