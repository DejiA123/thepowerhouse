/**
 * Advanced TypeScript Utilities - Production-Grade Type System
 * Demonstrates: Generics, Mapped Types, Conditional Types, Decorators, Type Guards
 * 
 * Modern TypeScript Features:
 * - Advanced type inference
 * - Generic constraints
 * - Mapped and conditional types
 * - Literal types and template literals
 * - Type guards and narrowing
 * - Decorators (experimental)
 * - Utility types composition
 */

// ==================== Advanced Type Utilities ====================

/**
 * Deep readonly type - recursively makes all properties readonly
 */
export type DeepReadonly<T> = {
    readonly [P in keyof T]: T[P] extends object
    ? DeepReadonly<T[P]>
    : T[P];
};

/**
 * Deep partial type - recursively makes all properties optional
 */
export type DeepPartial<T> = {
    [P in keyof T]?: T[P] extends object
    ? DeepPartial<T[P]>
    : T[P];
};

/**
 * Extract function property names
 */
export type FunctionPropertyNames<T> = {
    [K in keyof T]: T[K] extends Function ? K : never;
}[keyof T];

/**
 * Omit functions from type
 */
export type OmitFunctions<T> = Omit<T, FunctionPropertyNames<T>>;

/**
 * Conditional type for Promise unwrapping
 */
export type Awaited<T> = T extends Promise<infer U> ? U : T;

/**
 * Union to intersection type conversion
 */
export type UnionToIntersection<U> = (
    U extends any ? (k: U) => void : never
) extends (k: infer I) => void
    ? I
    : never;

/**
 * Template literal type for event names
 */
export type EventName<T extends string> = `on${Capitalize<T>}`;

/**
 * Tuple to object type conversion
 */
export type TupleToObject<T extends readonly (string | number | symbol)[]> = {
    [K in T[number]]: K;
};

// ==================== Generic Data Structures ====================

/**
 * Result type for error handling (Option pattern)
 */
export type Result<T, E = Error> =
    | { success: true; value: T }
    | { success: false; error: E };

/**
 * Generic repository interface with CRUD operations
 */
export interface Repository<T extends { id: string | number }> {
    findById(id: T['id']): Promise<T | null>;
    findAll(filter?: Partial<T>): Promise<T[]>;
    create(entity: Omit<T, 'id'>): Promise<T>;
    update(id: T['id'], updates: DeepPartial<T>): Promise<T>;
    delete(id: T['id']): Promise<boolean>;
}

/**
 * Generic paginated response
 */
export interface PaginatedResponse<T> {
    data: T[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
    };
}

// ==================== Type Guards ====================

/**
 * Type guard for checking if value is defined
 */
export function isDefined<T>(value: T | null | undefined): value is T {
    return value !== null && value !== undefined;
}

/**
 * Type guard for checking if value is a string
 */
export function isString(value: unknown): value is string {
    return typeof value === 'string';
}

/**
 * Type guard for checking if value is an object
 */
export function isObject<T extends object>(value: unknown): value is T {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Type guard with generic constraint
 */
export function hasProperty<T, K extends string>(
    obj: T,
    key: K
): obj is T & Record<K, unknown> {
    return isObject(obj) && key in obj;
}

// ==================== Advanced Generic Classes ====================

/**
 * Generic event emitter with type safety
 */
export class TypedEventEmitter<
    Events extends Record<string, any[]>
> {
    private listeners = new Map<keyof Events, Set<Function>>();

    on<K extends keyof Events>(
        event: K,
        callback: (...args: Events[K]) => void
    ): void {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event)!.add(callback);
    }

    emit<K extends keyof Events>(event: K, ...args: Events[K]): void {
        const callbacks = this.listeners.get(event);
        if (callbacks) {
            callbacks.forEach(callback => callback(...args));
        }
    }

    off<K extends keyof Events>(
        event: K,
        callback: (...args: Events[K]) => void
    ): void {
        const callbacks = this.listeners.get(event);
        if (callbacks) {
            callbacks.delete(callback);
        }
    }
}

/**
 * Generic state machine with type-safe transitions
 */
export class StateMachine<
    States extends string,
    Events extends string
> {
    private currentState: States;
    private transitions: Map<
        States,
        Partial<Record<Events, States>>
    >;

    constructor(
        initialState: States,
        transitions: Map<States, Partial<Record<Events, States>>>
    ) {
        this.currentState = initialState;
        this.transitions = transitions;
    }

    getState(): States {
        return this.currentState;
    }

    canTransition(event: Events): boolean {
        const stateTransitions = this.transitions.get(this.currentState);
        return stateTransitions?.[event] !== undefined;
    }

    transition(event: Events): Result<States, string> {
        const stateTransitions = this.transitions.get(this.currentState);
        const nextState = stateTransitions?.[event];

        if (!nextState) {
            return {
                success: false,
                error: `Invalid transition: ${event} from ${this.currentState}`
            };
        }

        this.currentState = nextState;
        return { success: true, value: nextState };
    }
}

/**
 * Generic cache with TTL support
 */
export class Cache<K, V> {
    private store = new Map<K, { value: V; expiry: number }>();
    private defaultTTL: number;

    constructor(defaultTTL: number = 60000) {
        this.defaultTTL = defaultTTL;
    }

    set(key: K, value: V, ttl?: number): void {
        const expiry = Date.now() + (ttl ?? this.defaultTTL);
        this.store.set(key, { value, expiry });
    }

    get(key: K): V | undefined {
        const entry = this.store.get(key);

        if (!entry) return undefined;

        if (Date.now() > entry.expiry) {
            this.store.delete(key);
            return undefined;
        }

        return entry.value;
    }

    has(key: K): boolean {
        return this.get(key) !== undefined;
    }

    clear(): void {
        this.store.clear();
    }

    size(): number {
        // Clean expired entries first
        for (const [key] of this.store) {
            this.get(key); // Triggers cleanup if expired
        }
        return this.store.size;
    }
}

// ==================== Advanced Functional Utilities ====================

/**
 * Compose functions with proper type inference
 */
export function compose<A, B, C>(
    f: (b: B) => C,
    g: (a: A) => B
): (a: A) => C {
    return (a: A) => f(g(a));
}

/**
 * Pipe functions with variadic arguments
 */
export function pipe<T>(...fns: Array<(arg: T) => T>): (arg: T) => T {
    return (arg: T) => fns.reduce((acc, fn) => fn(acc), arg);
}

/**
 * Debounce with proper typing
 */
export function debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout | null = null;

    return function (this: any, ...args: Parameters<T>) {
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

/**
 * Throttle with proper typing
 */
export function throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number
): (...args: Parameters<T>) => void {
    let inThrottle = false;

    return function (this: any, ...args: Parameters<T>) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => (inThrottle = false), limit);
        }
    };
}

/**
 * Memoize function results with generic typing
 */
export function memoize<T extends (...args: any[]) => any>(
    fn: T
): T {
    const cache = new Map<string, ReturnType<T>>();

    return ((...args: Parameters<T>): ReturnType<T> => {
        const key = JSON.stringify(args);

        if (cache.has(key)) {
            return cache.get(key)!;
        }

        const result = fn(...args);
        cache.set(key, result);
        return result;
    }) as T;
}

// ==================== Decorator Examples ====================

/**
 * Log method execution time
 */
export function logExecutionTime(
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
        const start = performance.now();
        const result = await originalMethod.apply(this, args);
        const end = performance.now();

        console.log(`[Timing] ${propertyKey} took ${(end - start).toFixed(2)}ms`);
        return result;
    };

    return descriptor;
}

/**
 * Validate method arguments
 */
export function validate(schema: Record<string, (value: any) => boolean>) {
    return function (
        target: any,
        propertyKey: string,
        descriptor: PropertyDescriptor
    ) {
        const originalMethod = descriptor.value;

        descriptor.value = function (...args: any[]) {
            const argNames = Object.keys(schema);

            for (let i = 0; i < argNames.length; i++) {
                const validator = schema[argNames[i]];
                if (!validator(args[i])) {
                    throw new Error(
                        `Invalid argument '${argNames[i]}' for ${propertyKey}`
                    );
                }
            }

            return originalMethod.apply(this, args);
        };

        return descriptor;
    };
}

// ==================== Export All ====================

export default {
    // Type guards
    isDefined,
    isString,
    isObject,
    hasProperty,

    // Classes
    TypedEventEmitter,
    StateMachine,
    Cache,

    // Functions
    compose,
    pipe,
    debounce,
    throttle,
    memoize,

    // Decorators
    logExecutionTime,
    validate
};
