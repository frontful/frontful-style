import PropTypes from 'prop-types'
import React from 'react'
import {Style} from './Style.jsx'
import {isBrowser} from 'frontful-utils'
import {manager} from './manager'

function style(definition) {
  return style.bind(definition)
}

style.manager = manager

style.bind = function (definition) {
  if (definition && typeof definition !== 'function') {
    if (typeof definition.default === 'function') {
      definition = definition.default
    }
  }

  if (!definition) {
    throw new Error(`[frontful-style] Missing style definition`)
  }

  const style = manager.createStyle(definition)

  return (Component) => {
    return class StyleComponent extends React.PureComponent {
      static contextTypes = {
        'style.manager.session': PropTypes.any
      }

      componentWillMount() {
        this.style = this.context['style.manager.session'].getInstance(style)
        if (super.componentWillMount) {
          super.componentWillMount.apply(this, arguments)
        }
      }

      render() {
        if (isBrowser()) {
          this.style.clearConfiguration()
        }
        return (
          <Component {...this.props} style={this.style}/>
        )
      }

      componentDidMount() {
        if (isBrowser()) {
          this.style.applyConfiguration()
        }
        if (super.componentDidMount) {
          super.componentDidMount.apply(this, arguments)
        }
      }

      componentDidUpdate() {
        if (isBrowser()) {
          if (this.style.configurations.length > 0) {
            this.style.applyConfiguration()
          }
        }
        if (super.componentDidUpdate) {
          super.componentDidUpdate.apply(this, arguments)
        }
      }

      componentWillUnmount() {
        this.style.dispose()
        if (super.componentWillUnmount) {
          super.componentWillUnmount.apply(this, arguments)
        }
      }
    }
  }
}

const reset = manager.reset

export {
  Style,
  reset,
  style,
}
