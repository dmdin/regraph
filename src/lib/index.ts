import chalk from 'chalk'
import { getContext, setContext } from 'svelte'
import {
  derived,
  get,
  readable,
  writable,
  type Invalidator,
  type Readable,
  type Unsubscriber,
  type Writable,
} from 'svelte/store'

type Connections = { [key: string]: string[] }
type ArrElement<T> = T extends (infer V)[] ? V : unknown

export type ComputeRun<I, N> = (args: {
  input: I
  neighbors: ArrElement<N>[]
  set: CallableFunction
}) => void

export type NodeConstructor<I> = {
  id: string
  value?: I
  graph: ReGraph<{}>
  factories?: any // TODO add back,
  args?: any
}

// TODO add debounce
export class Node<I, O = I> implements Writable<O> {
  id: string = ''
  deps: Writable<Array<Node<object, object> | I>> = writable([])
  lastRun: ComputeRun<unknown, unknown> = () => {}
  input: Writable<I> = writable()
  computed: Readable<O> = readable()
  computedUnsubscriber?: Unsubscriber

  output: Writable<O> = writable()
  graph: ReGraph<{}>

  constructor({
    id,
    value,
    graph,
    factories,
    args,
    deps = [],
  }: NodeConstructor<I>) {
    this.graph = graph
    factories = factories ?? {}

    if (this.graph._nodes[id]) {
      console.info(
        chalk.blueBright(
          `Found node "${chalk.underline.yellow(id)}" registered automatically before initialization`
        )
      )
      const node = this.graph._nodes[id]
      // if (factories.input) {
      //   node.input = factories.input(...(args.input || []))
      // }
      // if (factories.output) {
      //   node.output = factories.output(...(args.output || []))
      // }
      node.set(value)
      return node
    }
    // сюда передается undefind
    // console.log(this.graph._nodes, this.graph._nodes[id], id)
    this.id = id
    // @ts-ignore
    this.input = factories.input
      ? factories.input(...[value, ...(args.input || [])])
      : writable(value)
    this.deps = writable(deps)
    this.computed = derived(this.input, (v) => v) as unknown as Readable<O>
    // @ts-ignore
    this.output = factories.output
      ? factories.output(...(args.output || []))
      : writable()
    this.computedUnsubscriber = this.computed.subscribe((v) =>
      this.output.set(v)
    )

    if (!this.graph)
      throw Error('Node must be initialized under ReGraph context')

    // @ts-ignore
    this.graph.add(this)
  }

  _updateConnections() {
    const deps = get(this.deps)
    if (!deps?.length) return

    this.graph.connections.update((v) => {
      for (const d of deps) {
        v[d.id] = (v[d.id] ?? []).concat(this.id)
      }
      return v
    })
  }

  compute<D extends Node<object, object>>(
    deps: D[] | null,
    run: ComputeRun<I, D>
  ) {
    if (this?.computedUnsubscriber) this?.computedUnsubscriber()
    this.lastRun = run

    if (deps) {
      this.deps.set(deps)
    } else {
      deps = get(this.deps) || []
    }

    this._updateConnections()
    let previous
    this.computed = derived(
      [this.input, ...deps],
      ([input, ...neighbors], set) => {
        const current = JSON.stringify([input, neighbors])
        if (previous && previous === current) {
          return
        }

        previous = current
        // @ts-expect-error we override args of subscribers
        run({ input, neighbors, set, output: get(this.output) })
      }
    )

    this.computedUnsubscriber = this.computed.subscribe((v) => {
      this.output.set(v)
    })
  }

  subscribe<O>(
    run: (value: O, graph: ReGraph<object>) => void,
    invalidate?: Invalidator<O>
  ) {
    // console.log(this.id, this.output)
    return this.output.subscribe(
      // @ts-expect-error we know that value will be generic of output
      (value: O) => {
        run(value, this.graph)
      },
      invalidate
    )
  }
  // @ts-ignore
  set(value: I) {
    this.input.set(value)
  }

  setDeps<D extends Node<object, object>>(deps: D[]) {
    this.deps.set(deps)

    return this.deps
  }

  addDep<D extends Node<object, object>>(deps: D[] | D) {
    const newDeps = Array.isArray(deps) ? deps : [deps]
    this.deps.update((dependencies) => {
      return [...dependencies, ...newDeps]
    })
    this.compute(get(this.deps), this.lastRun)

    return this.deps
  }

  removeDep(node: Node<object, object>) {
    const indexToRemove = get(this.deps).findIndex((dep) => dep.id === node.id)
    if (indexToRemove < 0) return

    this.deps.update((deps) => {
      deps.splice(indexToRemove, 1)
      return deps
    })

    this.compute(get(this.deps), this.lastRun)
  }
}

export class ReGraph<T extends object> {
  _nodes: T
  connections: Writable<Connections>

  constructor(nodes?: T) {
    this._nodes = nodes ?? ({} as T)
    this.connections = writable({})

    setContext('ReGraph', this)
  }

  add(node: Node<object, object>) {
    this._nodes[node.id] = node
  }

  delete(node: Node<object, object>) {
    delete this._nodes[node.id]
  }

  get nodes() {
    return new Proxy(this._nodes, {
      get(target, id: string) {
        if (target[id]) return target[id]
        console.info(
          chalk.blueBright(
            `Create node "${chalk.underline.yellow(id)}" automatically before initialization`
          )
        )
        console.log('id', id)
        const node = new Node({ id, graph: this })
        return node
      },
    })
  }

  nodesById(ids: string[]): Node<unknown>[] {
    return ids.map((id) => this.nodes[id])
  }

  nodeById(id: string): Node<unknown> {
    return this._nodes[id]
  }

  static get self() {
    return getContext<ReGraph<object>>('ReGraph')
  }
}

class Planner {
  constructor() {}
}
