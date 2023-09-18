<template lang="pug">
#map(ref="map")
</template>

<script>
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

import { mapActions } from 'pinia'
import useAppStore from '@/stores/app'

export default {
  data: () => ({
    tileLayer: null
  }),
  methods: {
    ...mapActions(useAppStore, ['createPrediction']),
    async doCreatePrediction(input) {
      try {
        const { output } = await this.createPrediction({ input })
        console.log('--- API output, redrawing', output)
      } catch (e) {
        console.log('--- API error: ', e.message)
      }
    }
  },
  mounted() {
    const map = L.map(this.$refs.map, {
      crs: L.CRS.Simple,
      minZoom: 0,
      center: [1, 4],
      zoom: 0
    })
    const bounds = [
      [0, 0],
      [1024, 1024]
    ]
    map.fitBounds(bounds)

    // ...

    L.GridLayer.DebugCoords = L.GridLayer.extend({
      createTile: function (coords) {
        let tile = document.createElement('div')
        tile.innerHTML = [coords.z, coords.x, coords.y].join(', ')
        tile.style.outline = '1px solid red'
        return tile
      }
    })

    L.gridLayer.debugCoords = function (opts) {
      return new L.GridLayer.DebugCoords(opts)
    }

    map.addLayer(L.gridLayer.debugCoords())

    // ...

    L.TileLayer.SDXL = L.TileLayer.extend({
      getTileUrl: (coords) => {
        // Early abort
        if (coords.x < 0 || coords.y < 0) return

        if (coords.z > 0) {
          // Find parent tile
          const parentZ = coords.z - 1
          const parentX = Math.floor(coords.x / 2)
          const parentY = Math.floor(coords.y / 2)

          // Find the parent corner
          const left = coords.x % 2 === 0
          const top = coords.y % 2 === 0

          console.log(
            'Tile:',
            coords.z,
            coords.x,
            coords.y,
            'Parent Tile:',
            parentZ,
            parentX,
            parentY,
            'Left:',
            left,
            'Top:',
            top
          )

          this.doCreatePrediction({
            coords,
            parent: {
              z: parentZ,
              x: parentX,
              y: parentY
            },
            left,
            top
          })
        }

        return `https://upcdn.io/12a1ybR/raw/sdxl-leaflet/${coords.z}/${coords.x}/${coords.y}.png`
      }
    })

    this.tileLayer = new L.TileLayer.SDXL()
    this.tileLayer.addTo(map)
  }
}
</script>

<style lang="stylus" scoped>
#map
  height 100%
</style>
