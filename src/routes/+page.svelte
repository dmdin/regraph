<script lang="ts">
	import { Graph, Node, type Run } from '$lib/regraph.svelte';
	import { nanoid } from 'nanoid';
	import MultiSelect from 'svelte-multiselect';

	const graph = new Graph();
	const node = new Node({ graph, input: 1 });
	const node2 = new Node({ graph, input: 2 });
	let newNodeDeps = $state([]);

	const defaultCompute: Run<number, number> = ({ input, deps }) => {
		return deps.reduce((p, c) => p + c, input);
	};

	node.compute([node2], defaultCompute);

	function addNode() {
		const newNode = new Node({ graph, input: 0 });
		newNode.compute(newNodeDeps.map(id => graph.getById(id)), defaultCompute);
    newNodeDeps = []
	}
</script>

<h1 class="text-2xl font-bold">Welcome to ReGraph</h1>

<p class="mt-5">Compute function for all nodes:</p>
<code>
  deps.reduce((p, c) => p + c, input);
</code>


<div class="my-6 flex gap-2 flex-col border border-neutral-400 rounded-xl p-5 w-full">
  <span class="text-xl font-bold">New Node</span>
	<label>
    <span>Node Deps</span>
		<MultiSelect options={Object.values(graph.nodes).map(n => n.id)} bind:selected={newNodeDeps} />
	</label>
	<button class="h-full cursor-pointer rounded-xl bg-amber-500 px-2 py-1" onclick={addNode}>
		Add +
	</button>
</div>
<hr>

<div class="grid grid-cols-4 gap-3">
	<span>ID</span>
	<span>Node Input</span>
	<span>Node Dep</span>
	<span>Node Output</span>

	{#each Object.entries(graph.nodes) as [id, node] (id)}
		<span>{id}</span>
		<input type="number" class="number border border-neutral-300" bind:value={node.input} />
		<span class="truncate">{JSON.stringify(node.deps.map((n) => n.id))}</span>
		<span>{node.output}</span>
	{/each}
</div>
