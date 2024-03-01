

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

  Object.defineProperty(obj, key, {
    configurable: true,
    enumerable: true,
    get() {
      // console.log(`访问${key}属性`, val)
      // 属性的值为对象时响应式处理
      observe(val)

      // 收集依赖的时机，收集依赖于当前属性的订阅者
      if (activeWatcher) {
        dep.depend()
      }

      return val
    },
    set(newVal) {
      if (Object.is(newVal, val)) return
      // console.log(`改变${key}属性`, newVal, val)
      val = newVal
      // 设置的新值为对象时响应式处理
      observe(val)
      // 派发更新
      dep.notify()
    },
  })
}


function observe(obj) {
  if (obj === null || typeof (obj) !== "object") return
  if (obj.__ob__) return obj.__ob__
  return new Observer(obj)
}

class Observer {
  constructor(obj) {
    // 标识一个对象是否被响应式处理过
    Object.defineProperty(obj, "__ob__", {
      configurable: true,
      enumerable: false,
      value: this,
      writable: true,
    })
    if (Array.isArray(obj)) {

    } else {
      this.walk(obj)
    }
  }

  walk(obj) {
    Object.keys(obj).forEach((key) => {
      defineReactive(obj, key, obj[key])
    })
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
    this.addSub(activeWatcher)
    // activeWatcher.addDep(this)
  }

  // 通知订阅者更新
  notify() {
    this.subs.forEach((sub) => sub.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               ())
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
    this.value = this.get()

    // 现有依赖
    this.deps = new Set()
    // 新依赖
    this.newDeps = new Set()
  }

  // 
  get() {
    activeWatcher = this
    const value = this.getter.call(null)
    activeWatcher = null
    return value
  }



  update() {
    // 最新的值
    const newVal = this.get()
    if (Object.is(newVal, this.value)) return
    // 旧值
    const oldValue = this.value
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
  () => { return obj.flag ? obj.num1 : obj.num2 },
  (newVal, val) => {
    console.log('订阅者更新', newVal, val)
  }
)