const arrayProto = Array.prototype
const arrayMethods = Object.create(arrayProto)
const methodsToPatch = ['push', 'unshift', 'pop', 'shift', 'splice', 'sort', 'reverse']
methodsToPatch.forEach((method) => {
  // 数组原方法
  const rawMethod = arrayProto[method]
  Object.defineProperty(arrayMethods, method, {
    configurable: true,
    enumerable: false,
    writable: true,
    // 重写原方法
    value: function (...args) {
      // 调用原方法
      const result = rawMethod.apply(this, args)

      // 这里的 this 是数组本身，如 arr.push() 
      // 数组身上定义了 __ob__ 属性，__ob__ 上的 dep 属性用于数组依赖收集
      const ob = this.__ob__

      // 调用数组方法的参数，即新增的数组项
      let inserted

      switch (method) {
        case 'push':
        case 'unshift':
          inserted = args
          break
        case 'splice':
          inserted = args.slice(2)
          break
      }

      // 新增的数组项需要做响应式处理
      if (inserted) {
        ob.observeArray(inserted)
      }

      // 这七个方法会改变数组，所以需要派发更新
      ob.dep.notify()

      // 返回原方法的返回值
      return result
    }
  })
})

/**
 * 递归给数组中每个项收集依赖
 * @param {Array} items 数组
 */
function dependArray(items) {
  for (const item of items) {
    if (item && item.__ob__) {
      // 利用数组身上的 __ob__ 属性上的 dep 收集依赖
      item.__ob__.dep.depend()
    }
    if (Array.isArray(item)) {
      dependArray(item)
    }
  }
}

/**
 * 对象响应式处理
 * @param {*} obj 对象
 * @param {*} key 属性
 * @param {*} val 初始值
 * @returns 
 */
function defineReactive(obj, key, val) {
  // 对象的每一个属性都有对应的 Dep 实例
  const dep = new Dep()

  // 属性的值为对象时响应式处理
  // 返回的 childOb 是 Observer 实例，具有 dep ，用于数组依赖收集
  let childOb = observe(val)

  Object.defineProperty(obj, key, {
    configurable: true,
    enumerable: true,
    get() {
      // 收集依赖，即收集依赖于当前属性的订阅者
      // 存在活跃的订阅者时才需要收集依赖，普通访问不需要收集依赖
      if (activeWatcher) {
        // 这里对象的 dep 收集了依赖
        dep.depend()
        if (childOb) {
          // 如果值为对象或者数组，对象或者数组的 __ob__ 上的 dep 也会收集依赖
          childOb.dep.depend()
          // 如果值为数组
          if (Array.isArray(val)) {
            // 其中任何元素更新都需要通知更新
            // 所以数组中每个元素都要收集依赖，如果元素是对象或者数组，需要递归处理
            dependArray(val)
          }
        }
      }
      return val
    },
    set(newVal) {
      if (Object.is(newVal, val)) return
      val = newVal
      // 设置的新值为对象时响应式处理
      childOb = observe(newVal)
      // 派发更新
      dep.notify()
    },
  })
}

/**
 * 对象响应式处理
 * @param {Object} obj 对象或数组
 * @returns 
 */
function observe(obj) {
  if (obj === null || typeof (obj) !== "object") return
  if (obj.__ob__) return obj.__ob__
  return new Observer(obj)
}

class Observer {
  constructor(obj) {
    // 无奈的选择
    // Observer 实例上增加一个 dep 属性，值为 Dep 实例，用于收集数组依赖
    this.dep = new Dep()
    // 在传入的对象上上增加 __ob__ 属性，值是自身实例，标识对象已经被响应式处理过
    // 该实例的属性有 Dep 实例，用于数组依赖收集
    Object.defineProperty(obj, "__ob__", {
      configurable: true,
      enumerable: false,
      value: this,
      writable: true,
    })
    if (Array.isArray(obj)) {
      Object.setPrototypeOf(obj, arrayMethods)
      this.observeArray(obj)
    } else {
      this.walk(obj)
    }
  }

  walk(obj) {
    Object.keys(obj).forEach((key) => {
      defineReactive(obj, key, obj[key])
    })
  }

  /**
   * 数组中的每一项都要做响应式处理
   * @param {Array} items 数组
   */
  observeArray(items) {
    items.forEach((item) => observe(item))
  }
}

/**
 * 收集依赖
 */
class Dep {
  constructor() {
    // 保存订阅者
    this.subs = new Set()
  }

  /**
   * 添加订阅者
   * @param {Watcher} sub 订阅者实例
   */
  addSub(sub) {
    this.subs.add(sub)
  }

  /**
   * 移除订阅者
   * @param {Watcher} sub 订阅者实例
   */
  removeSub(sub) {
    this.subs.delete(sub)
  }

  // 收集依赖，保存当前活跃的订阅者，同时该订阅者保存 Dep 实例
  depend() {
    // this.addSub(activeWatcher)
    activeWatcher.addDep(this)
  }

  // 通知订阅者更新
  notify() {
    this.subs.forEach(sub => sub.update())
  }
}



let activeWatcher = null
/**
 * 订阅者
 */
class Watcher {
  /**
   * 
   * @param {Function} getter 读取属性方法
   * @param {Function} callback 回调方法
   */
  constructor(getter, callback) {
    this.getter = getter
    this.callback = callback
    // 现有依赖
    this.deps = new Set()
    // 新依赖
    this.newDeps = new Set()
    this.value = this.get()
  }

  // 
  get() {
    activeWatcher = this
    const value = this.getter.call(null)
    activeWatcher = null
    return value
  }

  addDep(dep) {
    if (!this.newDeps.has(dep)) {
      this.newDeps.add(dep)
      if (!this.deps.has(dep)) {
        dep.addSub(this)
      }
    }
  }

  cleanupDeps() {
    this.deps.forEach((dep) => {
      if (!this.newDeps.has(dep)) {
        dep.removeSub(this)
      }
    })
    this.deps = this.newDeps
    this.newDeps = new Set()
  }



  update() {
    // 最新的值
    const newVal = this.get()
    // 旧值
    const oldValue = this.value
    if (Object.is(newVal, oldValue)) return
    // 监听数组或者对象时，引用地址没变，但是里面内容变了，也需要更新
    if (!Object.is(newVal, this.value) || (val !== null && typeof val === 'object'))
      this.value = newVal
    this.callback.call(null, newVal, oldValue)
  }

  /**
   * 保存了哪些属性的 Dep 实例依赖该订阅者
   * @param {Dep} dep 对象的属性的 Dep 实例
   */
  addDep(dep) {
    if (!this.newDeps.has(dep)) {
      // 保存最新依赖该订阅者的 Dep 实例
      this.newDeps.add(dep)
      if (!this.deps.has(dep)) {
        // 如果之前保存的 Dep 实例中没有这个 Dep ，则让这个 Dep 实例收集该订阅者
        // 如此，完成了属性的 Dep 实例中收集了依赖于该属性的订阅者，订阅者也保存了这些属性的 Dep 实例
        // 为啥要这么做？
        // 因为只有订阅者知道自己依赖于哪些属性
        // 如某属性值为 b ? c : d，若 b 为 true，此时该属性依赖于 b 和 c
        // 当 b 值变化为 false 时，此时该属性依赖于 b 和 d
        // 这时就需要重新收集依赖，让 c 属性的 dep 取消对自己的订阅，并且让 d 属性的 dep 增肌对自己的订阅
        dep.addSub(this)
      }
    }
  }

}


const obj = {
  flag: true,
  num1: 1,
  num2: 1,
  b: [1, 2],
  c: {
    d: 1
  }
}
observe(obj)
window.obj = obj

// 全局设置一个唯一活跃的订阅者
// 订阅者知道自身依赖于哪些属性，在访问该属性前一刻，将活跃的订阅者赋值为自身
// 存在活跃的订阅者的时候，访问已做过响应式处理的对象的属性，触发属性中 Dep 实例去收集依赖
// 读取属性结束后，将活跃的订阅者赋值为 null，由于 JS 单线程的特性，全局同时仅会存在一个活跃的订阅者
new Watcher(
  () => { return obj.b[0] },
  (newVal, val) => {
    console.log('订阅者更新', newVal, val)
  }
)