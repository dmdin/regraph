<script lang="ts">
	import '../app.css';

	let { children } = $props();
</script>

<main class="w-full p-2 h-fit mt-5 m-auto flex flex-col items-center md:w-md">
{@render children()}
</main>