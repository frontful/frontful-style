import Prefixer from 'inline-style-prefixer'
import {fork, isBrowser} from 'frontful-utils'
import {Style} from './Style'
import {merge} from 'lodash'

const headElement = isBrowser() ? document.getElementsByTagName('head')[0] : null

class Manager {
  constructor({config, dependencies, extensions} = {}) {
    this.config = config
    this.dependencies = dependencies
    this.extensions = extensions

    this.definitions = []
    this.styles = []

    this.reset = this.reset.bind(this)
  }

  get config() {
    if (!this._config) {
      this.config = {}
    }
    return this._config
  }
  set config(config) {
    this._config = merge({
      minify: false,
      keepOriginalClassNames: false,
    }, this._config, config)
  }

  get dependencies() {
    if (!this._dependencies) {
      this.dependencies = {}
    }
    return this._dependencies
  }
  set dependencies(dependencies) {
    this._dependencies = merge({}, this._dependencies, dependencies)
  }

  get extensions() {
    if (!this._extensions) {
      this.extensions = {}
    }
    return this._extensions
  }
  set extensions(extensions) {
    this._extensions = merge({}, this._extensions, extensions)
  }

  createStyle = (definition) => {
    let index = this.definitions.indexOf(definition)
    if (index === -1) {
      index = this.styles.length
      const style = new Style(definition, index)
      this.definitions.push(definition)
      this.styles.push(style)
    }
    return this.styles[index]
  }

  reset() {
    this.definitions = []
    this.styles = []
  }

  getSession(userAgent) {
    return fork(this, {
      prefixer: new Prefixer({
        userAgent: userAgent
      }),
      isSession: true,
      instances: [],
    })
  }

  getInstance(style, props) {
    if (!this.instances[style.index]) {
      this.instances[style.index] = []
    }

    const index = this.instances[style.index].length
    const instance = style.getInstance(this, index, props)

    this.instances[style.index].push(instance)

    return instance
  }

  getStyleDescriptor(style) {
    const instances = this.instances[style.index]

    const grouped = instances.reduce((grouped, instance) => {
      if (instance.hasOwnProperty('provider')) {
        grouped.instances.push(instance)
      }
      else {
        grouped.generic.push(instance)
      }
      return grouped
    }, {
      generic: [],
      instances: [],
    })

    return {
      id: style.index,
      instances: [].concat(
        style.provider.getDescriptor(grouped.generic.reduce((configs, instance) => {
          return configs.concat(instance.configurations)
        }, [])),
        grouped.instances.map((instance) => {
          return instance.provider.getDescriptor(instance.configurations)
        })
      )
    }
  }

  getDescriptor() {
    const result = this.instances.reduce((descriptor, instances, index) => {
      if (instances) {
        descriptor.styles.push(this.getStyleDescriptor(this.styles[index]))
      }
      return descriptor
    }, {
      styles: [],
    })

    return result
  }

  flatten(stylesheet) {
    return Object.keys(stylesheet).reduce((flat, key) => {
      flat[key] = stylesheet[key] + ''
      return flat
    }, {})
  }

  renderStylesheet(_stylesheet, spacing) {
    spacing = spacing || ''
    if (_stylesheet) {
      const stylesheet = this.flatten(_stylesheet)
      const prefixedStylesheet = this.prefixer.prefix(stylesheet)
      return Object.keys(prefixedStylesheet).reduce((lines, propertyName) => {
        const endPropName = propertyName.replace(/([A-Z])/g, '-$1').toLowerCase()
        if (Array.isArray(prefixedStylesheet[propertyName])) {
          prefixedStylesheet[propertyName].forEach((value) => {
            lines.push(`${this.config.minify ? '' : (spacing + '  ')}${endPropName}: ${value};`)
          })
        }
        else {
          lines.push(`${this.config.minify ? '' : (spacing + '  ')}${endPropName}: ${prefixedStylesheet[propertyName]};`)
        }
        return lines
      }, []).join(this.config.minify ? '' : '\r\n')
    }
    return ''
  }

  renderInstance(instance, spacing) {
    spacing = spacing || ''
    const lines = []
    if (instance.selector) {
      lines.push(spacing + instance.selector + ' {')

      if (instance.children) {
        instance.children.forEach(instance => {
          lines.push(this.renderInstance(instance, (spacing || '') + '  '))
        })
      }

      lines.push(this.renderStylesheet(instance.stylesheet, spacing))
      lines.push((this.config.minify ? '' : spacing) + '}')
    }
    else if (instance.children) {
      instance.children.forEach(instance => {
        lines.push(this.renderInstance(instance))
      })
    }

    if (instance.siblings) {
      instance.siblings.forEach(sibling => {
        lines.push(this.renderInstance(sibling))
      })
    }

    return lines.join(this.config.minify ? '' : '\r\n')
  }

  renderStyle(style) {
    return style.instances.map((instance) => {
      return this.renderInstance(instance)
    }).join(this.config.minify ? '' : '\r\n')
  }

  renderToString() {
    const descriptor = this.getDescriptor()
    return descriptor.styles.map((style) => {
      return this.renderStyle(style)
    }).reduce((styles, stylesheet, index) => {
      styles.push(`<style id="sidx_${descriptor.styles[index].id}" type="text/css">`)
      styles.push(stylesheet)
      styles.push(`</style>`)
      return styles
    }, []).join(this.config.minify ? '' : '\r\n')
  }

  createStyleElement(index, css) {
    const style = document.createElement('style')
    style.id = `sidx_${index}`
    style.type = 'text/css'
    if (style.styleSheet) {
      style.styleSheet.cssText = css
    } else {
      style.appendChild(document.createTextNode(css))
    }
    return style
  }

  insertStyleElement(index, newElement) {
    const id = `sidx_${index}`
    const oldElement = document.getElementById(id)
    if (oldElement) {
      if (headElement) {
        headElement.replaceChild(newElement, oldElement)
      }
    }
    else {
      let insertBeforeId = 'sidx'
      for (let i = index + 1, l = this.instances.length; i < l; i++) {
        if (this.instances[i]) {
          if (document.getElementById(`sidx_${i}`)) {
            insertBeforeId = `sidx_${i}`
            break
          }
        }
      }
      const prevElement = document.getElementById(insertBeforeId) || document.getElementById('sidx')
      if (headElement) {
        headElement.insertBefore(newElement, prevElement);
      }
    }
  }

  renderIntoDOM(styleInstance) {
    const index = styleInstance.index
    const styleDescriptor = this.getStyleDescriptor(this.styles[index])
    const renderedStyle = this.renderStyle(styleDescriptor)
    const styleElement = this.createStyleElement(index, renderedStyle)
    this.insertStyleElement(index, styleElement)
  }

  dispose(styleInstance) {
    const index = styleInstance.index
    const instances = this.instances[index]
    instances.splice(instances.indexOf(styleInstance), 1)
    if (this.instances[index].length === 0) {
      const styleElement = document.getElementById(`sidx_${index}`)
      if (headElement && styleElement) {
        headElement.removeChild(styleElement)
      }
      this.instances[index] = null
    }
  }
}

export {
  Manager,
}
