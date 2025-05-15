<template>
  <div>
    <div ref="legendContainer" class="custom-legend"></div>
    <canvas ref="canvas"></canvas>
  </div>
</template>

<script setup>
import { onMounted, watch, ref, nextTick } from 'vue'
import { Chart, registerables } from 'chart.js'

Chart.register(...registerables)

const props = defineProps({
  chartData: {
    type: Object,
    required: true
  }
})

const canvas = ref(null)
const legendContainer = ref(null)
let chartInstance = null

watch(() => props.chartData, () => {
  renderChart()
}, { deep: true })

onMounted(() => {
  renderChart()
})

const renderChart = async () => {
  if (chartInstance) {
    chartInstance.destroy()
  }

  await nextTick()

  chartInstance = new Chart(canvas.value, {
    type: 'line',
    data: props.chartData,
    options: {
      responsive: true,
      interaction: {
        mode: 'index',
        intersect: false
      },
      plugins: {
        legend: {
          display: true,
          position: 'top'
        },
        tooltip: {
          mode: 'index',
          intersect: false
        },
        title: {
          display: true,
          text: '검색어 트렌드 변화'
        }
      },
      elements: {
        line: {
          spanGaps: true  // ✅ 여기가 핵심
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: '비율'
          }
        },
        x: {
          title: {
            display: true,
            text: '기간'
          }
        }
      }
    }
  })
}
</script>

<style scoped>
.custom-legend {
  margin-bottom: 8px;
}
</style>
