<script setup>
import { computed, ref, onMounted, onBeforeUnmount } from "vue";

const props = defineProps({
  options: {
    type: Array,
    required: true,
    default: () => [],
  },
  modelValue: {
    type: Array,
    required: true,
    default: () => [],
  },
  placeholder: {
    type: String,
    default: "Select campaigns...",
  },
});

const emit = defineEmits(["update:modelValue"]);

const isOpen = ref(false);
const searchTerm = ref("");
const dropdownRef = ref(null);

const filteredOptions = computed(() => {
  if (!searchTerm.value) {
    return props.options;
  }
  return props.options.filter((option) =>
    option.label.toLowerCase().includes(searchTerm.value.toLowerCase()),
  );
});

const selectedOptions = computed(() => {
  return props.options.filter((option) =>
    props.modelValue.includes(option.value),
  );
});

const toggleDropdown = () => {
  isOpen.value = !isOpen.value;
  if (!isOpen.value) {
    searchTerm.value = "";
  }
};

const handleClickOutside = (event) => {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target)) {
    isOpen.value = false;
    searchTerm.value = "";
  }
};

onMounted(() => {
  window.addEventListener("click", handleClickOutside);
});

onBeforeUnmount(() => {
  window.removeEventListener("click", handleClickOutside);
});

const handleCheckboxChange = (event, optionValue) => {
  const newSelectedValues = [...props.modelValue];
  if (event.target.checked) {
    if (!newSelectedValues.includes(optionValue)) {
      newSelectedValues.push(optionValue);
    }
  } else {
    const index = newSelectedValues.indexOf(optionValue);
    if (index > -1) {
      newSelectedValues.splice(index, 1);
    }
  }
  emit("update:modelValue", newSelectedValues);
};

const removeOption = (optionValue) => {
  const newSelectedValues = props.modelValue.filter(
    (value) => value !== optionValue,
  );
  emit("update:modelValue", newSelectedValues);
};
</script>

<template>
  <div class="relative" ref="dropdownRef">
    <div
      @click="toggleDropdown"
      class="w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm pl-3 pr-10 py-2 text-left cursor-default focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-white min-h-[38px] flex flex-wrap items-center"
    >
      <template v-if="modelValue.length > 0">
        <span
          v-for="selected in selectedOptions"
          :key="selected.value"
          class="bg-indigo-500 text-white text-base font-semibold mr-2 px-2.5 py-0.5 rounded-full flex items-center"
        >
          {{ selected.label }}
          <button
            @click.stop="removeOption(selected.value)"
            class="ml-2 text-white hover:text-gray-200"
          >
            &times;
          </button>
        </span>
      </template>
      <span v-else class="text-gray-400">{{ placeholder }}</span>

      <span
        class="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none"
      >
        <svg
          class="h-5 w-5 text-gray-400"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fill-rule="evenodd"
            d="M10 3a1 1 0 01.707.293l3 3a1 1 0 01-1.414 1.414L10 5.414 7.707 7.707a1 1 0 01-1.414-1.414l3-3A1 1 0 0110 3zm-3.707 9.293a1 1 0 011.414 0L10 14.586l2.293-2.293a1 1 0 011.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
            clip-rule="evenodd"
          />
        </svg>
      </span>
    </div>
    <div
      v-if="isOpen"
      class="absolute mt-1 w-full rounded-md bg-gray-700 shadow-lg z-10"
    >
      <div class="p-2">
        <input
          type="text"
          v-model="searchTerm"
          placeholder="Search..."
          class="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        />
      </div>
      <ul
        class="max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm"
      >
        <li
          v-for="option in filteredOptions"
          :key="option.value"
          class="text-white cursor-default select-none relative py-2 pl-3 pr-9"
        >
          <label class="flex items-center">
            <input
              type="checkbox"
              :value="option.value"
              :checked="modelValue.includes(option.value)"
              @change="handleCheckboxChange($event, option.value)"
              class="h-4 w-4 text-indigo-600 border-gray-500 rounded bg-gray-600 focus:ring-indigo-500"
            />
            <span class="ml-3 block font-normal truncate text-base">{{
              option.label
            }}</span>
          </label>
        </li>
      </ul>
    </div>
  </div>
</template>
