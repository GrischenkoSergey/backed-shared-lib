import type { INestApplication, Type } from '@nestjs/common';

type Target = InstanceType<Type>;
type Dependency = Type;
type Dependencies = WeakMap<Dependency, InstanceType<Dependency>>;
type Container = WeakMap<Target, Dependencies>;

export class WeakDI {
    private static app: INestApplication;
    private static container: Container;

    static setApp(app: INestApplication) {
        this.app = app;
    }

    static resolve<T extends Dependency>(target: Target, dependency: T): InstanceType<T> | null {
        if (!this.container) this.container = new WeakMap();
        if (!this.container.has(target)) this.container.set(target, new WeakMap());

        const dependencies = this.container.get(target)!;

        if (dependencies.has(dependency)) {
            return dependencies.get(dependency) as InstanceType<T>;
        }

        const resolved = this.app.get(dependency);
        if (!resolved) return null;

        dependencies.set(dependency, resolved);
        this.container.set(target, dependencies);

        return resolved;
    }
}