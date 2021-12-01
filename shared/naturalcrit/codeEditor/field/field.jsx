const React = require('react');
const createClass = require('create-react-class');
const _ = require('lodash');

const Field = createClass({
	getDefaultProps : function() {
		return {
			field    : {},
			n        : 0,
			value    : '',
			onChange : ()=>{}
		};
	},

	getInitialState : function() {
		return {
			value   : ''
		};
	},

	componentDidMount : function() {
		this.setState({
			value : this.props.value
		});
	},

	change : function(e) {
		this.props.onChange(e);
		this.setState({
			value : e.target.value
		});
	},

	render : function(){
		const { field, n } = this.props;
		const id = `${field.name}-${field.type}-${n}`;
		return <React.Fragment>
			<label htmlFor={id}>{_.startCase(field.name)}</label>
			<input id={id} type='number' value={this.state.value} step={field.increment || 1} onChange={this.change}/>
		</React.Fragment>;
	}
});

module.exports = Field;