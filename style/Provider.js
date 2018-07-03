import difference from 'lodash/difference'
import intersection from 'lodash/intersection'
import mapValues from 'lodash/mapValues'
import merge from 'lodash/merge'
import uniq from 'lodash/uniq'
import {Style} from './Style'
import {manager} from './Manager'

const regexpBraces = new RegExp('(\\{.*?\\})', 'gi')
const regexpClassNames = new RegExp('([.][^:# .,}{]+)', 'gi')

class Provider {
  parent = null
  selector = null
  definition = null
  props = null
  children = []
  stylesheet = null
  classNames = null

  constructor(parent, ...args) {
    this.parent = parent

    if (!args[0] || typeof args[0] === 'string') {
      this.selector = args[0]
      this.definition = args[1]
      this.props = args[2] || {}
    }
    else {
      this.selector = null
      this.definition = args[0]
      this.props = args[1] || {}
    }

    if (typeof this.definition !== 'function') {
      const definition = this.definition
      this.definition = () => definition
    }

    const {theme, ...restDefinitionProps} = this.props

    const definitionProps = {
      ...manager.dependencies,
      ...restDefinitionProps,
      theme: theme ? merge({}, manager.dependencies.theme, theme) : manager.dependencies.theme,
      css: this.css.bind(this),
    }

    let extendedDefinitionProps = definitionProps

    if (manager.extensions) {
      extendedDefinitionProps = {
        ...definitionProps,
        ...mapValues(manager.extensions, (extension) => this.initializeExtension(extension, definitionProps))
      }
    }

    this.stylesheet = this.definition(extendedDefinitionProps)

    this.classNames = this.getClassess()
  }

  get id() {
    if (!this._id) {
      this._id = this.getStyle().id
    }
    return this._id
  }

  getClassess() {
    if (this.selector) {
      const match = this.selector.replace(regexpBraces, '{}').match(regexpClassNames)

      return match ? uniq(match).map((dotName) => {
        return dotName.replace('.', '')
      }) : null
    }
    return null
  }

  css(...args) {
    const provider = new Provider(this, ...args)
    this.children.push(provider)
    return provider
  }

  initializeExtension(extension, props) {
    if (typeof extension === 'function') {
      return extension(props)
    }
    else {
      return mapValues(extension, (extension) => this.initializeExtension(extension, props))
    }
  }

  as(name, parser) {
    this.getStyle().expose(name, this, parser)
    return this
  }

  getStyle() {
    if (this.parent instanceof Style) {
      return this.parent
    }
    else {
      return this.parent.getStyle()
    }
  }

  _css(ref) {
    if (this.classNames && ref.usedDefinitions.indexOf(this.definition) === -1) {

      const usedClassNames = intersection(this.classNames, ref.classNames)
        if (usedClassNames.length > 0) {
        ref.usedClassNames = ref.usedClassNames.concat(usedClassNames)
        ref.usedDefinitions.push(this.definition)
        ref.result = ref.result.concat(usedClassNames.map((name) => (`${manager.config.keepOriginalClassNames ? `_${name} ` : ''}${name}_${this.id}`)))
      }
    }

    if (this.children && this.children.length) {
      ref = this.children.reduce((ref, provider) => (
        provider._css(ref)
      ), ref)
    }

    return this.getStyle()._css(ref)
  }

  getHashedSelector(selector, id) {
    if (selector) {
      const globals = selector.match(regexpBraces)
      if (globals) {
        return globals.reduce((withHashes, glob, index) => {
          return withHashes.replace(`{${index}}`, glob)
        }, globals.reduce((withMarkers, glob, index) => {
          return withMarkers.replace(glob, `{${index}}`)
        }, selector).replace(regexpClassNames, `$1_${id}`)).replace(/(\}|\{)/g, '')
      }
      else {
        return selector.replace(regexpClassNames, `$1_${id}`)
      }
    }
    return selector
  }

  getDescriptor(siblingStyleCandidates) {
    let siblingStyleCandidatesUsed = siblingStyleCandidates.filter((siblingStyle) => {
      return siblingStyle.provider.definition === this.definition
    })

    const siblingStyleCandidatesUnused = difference(siblingStyleCandidates, siblingStyleCandidatesUsed)

    const descriptor = {
      id: this.id,
      selector: this.getHashedSelector(this.selector, this.id),
      stylesheet: this.stylesheet,
      siblings: siblingStyleCandidatesUsed.map((siblingStyle) => {
        return siblingStyle.provider.getDescriptor(siblingStyleCandidatesUnused)
      }),
      children: this.children.map((provider) => {
        return provider.getDescriptor(siblingStyleCandidatesUnused)
      })
    }

    if (!descriptor.selector) {
      delete descriptor.selector
    }

    if (!descriptor.stylesheet) {
      delete descriptor.stylesheet
    }

    if (!descriptor.siblings.length) {
      delete descriptor.siblings
    }

    if (!descriptor.children.length) {
      delete descriptor.children
    }

    return descriptor
  }
}

export {
  Provider,
}
