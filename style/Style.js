import {fork} from 'frontful-utils'
import {Provider} from './Provider'
import {difference, uniq} from 'lodash'

class Style {
  constructor(definition, index) {
    this.definition = definition
    this.index = index
    this.provider = new Provider(this, this.definition)
    this.expose('theme', this.provider, (theme) => ({theme}))
  }

  get id() {
    return this.index + (typeof this.instanceIndex === 'number' ?
      '_' + this.instanceIndex + (this.hasOwnProperty('isConfiguration') ?
        '_' + (
          this.configurations.indexOf(this)
        ) : ''
      ) : ''
    )
  }

  expose(name, provider, parser) {
    this[name] = function(...args) {
      return this.getConfigured(provider, parser ? parser(...args) : args[0])
    }
  }

  with(props) {
    if (props) {
      return fork(this, {
        _with: props
      })
    }
    else {
      return this
    }
  }

  getConfigured(provider, props) {
    const style = fork(this, {
      isConfiguration: true,
      provider: null,
    })

    style.provider = new Provider(style, provider.selector, provider.definition, props)

    if (this.isInstance) {
      this.configurations.push(style)
    }

    return style
  }

  getInstance(sessionStyleManager, instanceIndex, props) {
    let style = null

    if (props || this._with) {
      style = fork(this, {
        isInstance: true,
        configurations: [],
        sessionStyleManager: sessionStyleManager,
        provider: null,
      })
      delete style._with
      style.provider = new Provider(style, this.definition, props || this._with)
    }
    else {
      style = fork(this, {
        isInstance: true,
        configurations: [],
        sessionStyleManager: sessionStyleManager,
      })
    }

    style.instanceIndex = instanceIndex

    return style
  }

  css(...classNames) {
    const ref = this.provider._css({
      classNames: classNames.reduce((classes, className) => {
        if (typeof className === 'string') {
          classes.push(className)
        }
        return classes
      }, []),
      usedDefinitions: [],
      usedClassNames: [],
      result: [],
    })

    const extraStyles = difference(ref.classNames, ref.usedClassNames)

    return uniq(ref.result.concat(extraStyles)).join(' ')
  }

  _css(ref) {
    if (this.__proto__.provider) {
      return this.__proto__.provider._css(ref)
    }
    return ref
  }

  applyConfiguration() {
    this.sessionStyleManager.renderIntoDOM(this)
  }

  clearConfiguration() {
    this.configurations = []
  }

  dispose() {
    this.sessionStyleManager.dispose(this)
  }
}

export {
  Style,
}
