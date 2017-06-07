import PropTypes from 'prop-types'
import React from 'react'
import {getDisplayName, isBrowser} from 'frontful-utils'
import {Manager} from './Manager'
import {Session} from './Session.jsx'

const manager = new Manager()

function style(definition) {
  const style = manager.createStyle(definition)

  return (Component) => {
    return class StyleComponent extends React.PureComponent {
      static displayName = `Style(${getDisplayName(Component)})`

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

style.manager = manager

const Style = {
  Session,
}

const reset = manager.reset

export {
  Session,
  Style,
  manager,
  reset,
  style,
}
