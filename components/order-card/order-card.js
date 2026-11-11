Component({ options: { styleIsolation: "apply-shared", multipleSlots: true }, properties: { order: Object }, methods: { open() { this.triggerEvent('open',{id:this.data.order._id}) } } })
