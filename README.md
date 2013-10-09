# Key Value Observing

When an class property is bound, it is converted into an object and a reference to the object is assigned to each class. In this way, each class is accessing the exact same property.

Class properties must be accessed and modified using the setters and getters. Should any 'changed' callbacks be registered, they will be invoked when set() is called.