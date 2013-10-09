
var LI = {};

LI.Object = Fiber.extend(function(base){});

Fiber.mixin(LI.Object, KVO);

var MyModel = LI.Object.extend(function (base) {

  return {
    firstName: 'Bill',
    lastName: 'Bob',
    age: 25
  };

});

var MyController = LI.Object.extend( function (base) {

  return {
    init: function (model, view) {
      this.model = model;
      this.view = view;
      var self = this;
      setTimeout(function () {
        self.set('showButton', false);
      }, 2000);
    },
    showButton: true
  };
});

var MyView = LI.Object.extend( function (base) {

  return {
    el: $('#name'),
    init: function () {
      this.el.on('keyup', $.proxy(this._update, this));
    },
    _update: function ( evt ) {
      this.set('firstName', evt.target.value);
    },
    render: function () {
      var name = this.get('firstName');
      this.el.val(name);
      $('p').text(name);
    },
    firstNameChanged: function (firstName) {
      console.log( firstName );
      this.render();
    },
    showButtonChanged: function (buttonState) {
      console.log( buttonState );
      var isButtonShown= this.get('showButton');

      if (isButtonShown) {
        $('button').show();
      } else {
        $('button').hide();
      }
    }
  };

});

var model = new MyModel();
var view = new MyView();
var controller = new MyController(model, view);

controller.bindTo('firstName', model);
view.bindTo('firstName', controller); // Proxied from the model
view.bindTo('showButton', controller);

view.firstNameChanged = function () {
  console.log( 'foooo');
};

controller.firstNameChanged = function () {
  console.log( 'from the ctrl' );
};

