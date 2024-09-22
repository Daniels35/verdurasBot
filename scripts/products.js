const fs = require('fs');
const path = require('path');

const productsFilePath = path.join(__dirname, '../data/products.json');

// Leer productos desde el archivo JSON
const readProducts = () => {
  const productsData = fs.readFileSync(productsFilePath);
  return JSON.parse(productsData);
};

// Guardar productos en el archivo JSON
const saveProducts = (products) => {
  fs.writeFileSync(productsFilePath, JSON.stringify(products, null, 2));
};

// Obtener todos los productos
const getAllProducts = () => {
  return readProducts();
};

// Agregar un nuevo producto
const addProduct = (product) => {
  const products = readProducts();
  product.id = products.length ? products[products.length - 1].id + 1 : 1;
  products.push(product);
  saveProducts(products);
};

// Editar un producto existente
const editProduct = (id, updatedProduct) => {
  const products = readProducts();
  const productIndex = products.findIndex((prod) => prod.id === id);
  if (productIndex > -1) {
    products[productIndex] = { ...products[productIndex], ...updatedProduct };
    saveProducts(products);
  }
};

// Eliminar un producto
const deleteProduct = (id) => {
  let products = readProducts();
  products = products.filter((product) => product.id !== id);
  saveProducts(products);
};

module.exports = {
  getAllProducts,
  addProduct,
  editProduct,
  deleteProduct
};