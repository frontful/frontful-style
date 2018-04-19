import PropTypes from 'prop-types'
import React from 'react'
import {manager} from './Manager'

class Style extends React.Component {
  componentWillMount() {
    this.session = this.props.session || manager.getSession()

    if (this.props.globalStyle) {
      this.style = this.session.getInstance(this.props.globalStyle)
    }
  }

  static childContextTypes = {
    'style.manager.session': PropTypes.any
  }

  getChildContext() {
    return {
      'style.manager.session': this.session
    }
  }

  render() {
    return React.Children.only(this.props.children)
  }

  componentWillUnmount() {
    if (this.props.globalStyle && this.style) {
      this.style.dispose()
    }
  }
}

export {
  Style,
}
