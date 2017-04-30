import PropTypes from 'prop-types'
import React from 'react'
import getDisplayName from '../utils/getDisplayName'
import isBrowser from '../utils/isBrowser'
import {createStyle} from '../style'

function style(definition) {
  const style = createStyle(definition)

  return (Component) => {
    return class StyleComponent extends React.PureComponent {
      static displayName = `Style(${getDisplayName(Component)})`

      static contextTypes = {
        sessionStyleManager: PropTypes.any
      }

      componentWillMount() {
        this.style = this.context.sessionStyleManager.getInstance(style)
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

export default style
