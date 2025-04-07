import { nanoid } from 'nanoid';
import { getContext, setContext } from 'svelte';

export type Run<I, O> = ({ input, deps }: { input?: I; deps: unknown[] }) => O | undefined;
export class Node<I, O> {
	id = '';
	input?: I = $state();
	deps: Node<unknown, unknown>[] = $state([]);
	run: Run<I, O> = $state(({ input, deps }) => input as O);

  #prev = null
	output?: O = $derived.by(() => {
		let depValues = this.deps.map((d) => d.output);
    const args = {input: this.input, deps: depValues}
    if (JSON.stringify(this.#prev) === JSON.stringify(args)) return
    this.#prev = args
		return this.run({ input: this.input, deps: depValues });
	});


	constructor({ graph, id, input }: { graph: Graph; id?: string; input?: I }) {
		this.id = id ?? nanoid(5);
		this.input = input;

		// @ts-ignore
		graph.add(this);
	}

	compute(deps: Node<unknown, unknown>[], run: Run<I, O>) {
		this.deps = deps;
		this.run = run;
	}
}

type Nodes = Record<string, Node<unknown, unknown>>;

const CTX_KEY = 'graph';

export class Graph {
	nodes: Nodes = $state({});

	constructor(nodes?: Nodes) {
		this.nodes = nodes ?? {};
		setContext(CTX_KEY, this);
	}

	static get self(): Graph {
		return getContext(CTX_KEY);
	}

	add(node: Node<unknown, unknown>) {
		this.nodes[node.id] = node;
	}

	getById(id: string) {
		return this.nodes[id];
	}
}
