/**
 * Common storage interface
 */
export interface StorageInterface<K = string, V = unknown> {
    set(key: K, value: V): void | Promise<void>

    get(key: K): V | Promise<V>

    remove(key: K): void | Promise<void>
}
