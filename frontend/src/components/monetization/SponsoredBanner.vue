<script setup>
import { onMounted, ref } from "vue";
import paymentApi from "@/services/payment";

const props = defineProps({
  placement: { type: String, default: "home_top" },
});

const banners = ref([]);
const currentIndex = ref(0);

async function load() {
  try {
    const data = await paymentApi.getBanners(props.placement);
    banners.value = data || [];
  } catch (e) {
    console.error(e);
  }
}

function next() {
  if (banners.value.length > 1) {
    currentIndex.value = (currentIndex.value + 1) % banners.value.length;
  }
}

function handleClick(banner) {
  window.open(banner.lien_url, "_blank");
}

let interval = null;

onMounted(() => {
  load();
  interval = setInterval(next, 8000);
});
</script>

<template>
  <div v-if="banners.length" class="container-page py-3">
    <div
      class="relative rounded-xl overflow-hidden cursor-pointer"
      @click="handleClick(banners[currentIndex])"
    >
      <img
        :src="banners[currentIndex].image_url"
        :alt="banners[currentIndex].titre"
        class="w-full h-32 sm:h-40 object-cover"
      />
      <div class="absolute top-2 right-2">
        <span class="text-[10px] bg-black/40 text-white px-1.5 py-0.5 rounded">
          Sponsorisé
        </span>
      </div>
      <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
        <p class="text-white text-sm font-medium">
          {{ banners[currentIndex].titre }}
        </p>
      </div>
      <div
        v-if="banners.length > 1"
        class="absolute bottom-2 right-2 flex gap-1"
      >
        <span
          v-for="(_, i) in banners"
          :key="i"
          :class="[
            'w-1.5 h-1.5 rounded-full',
            i === currentIndex ? 'bg-white' : 'bg-white/40',
          ]"
        ></span>
      </div>
    </div>
  </div>
</template>
